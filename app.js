// create constants for the form and form controls
const newVacationFormEl = document.getElementsByTagName("form")[0];
const startDateInputEl = document.getElementById('start-date');
const endDateInputEl = document.getElementById('end-date');
const pastVacationContainer = document.getElementById("past-vacations");

// listen to form submissions
newVacationFormEl.addEventListener("submit", (event)=>{
    // prevent form from submitting to server, since doing everything from client side
    event.preventDefault();

    // get dates from form
    const startDate = startDateInputEl.value;
    const endDate = endDateInputEl.value;

    // check if dates are invalid
    if(checkDatesInvalid(startDate, endDate)){
        return; // dont submit form, just exit
    }

    // store new vacation in client side storage
    storeNewVacation(startDate, endDate);

    // refresh UI
    renderPastVacations();

    // reset the form
    newVacationFormEl.reset();
});

function checkDatesInvalid(startDate, endDate){
    if(!startDate || !endDate || startDate > endDate){
        // should provide error message here
        // just clear form if anything invalid
        newVacationFormEl.reset();

        return true; // something is invalid
    } else {
        return false; // everythiung is good
    }
}

// add the storage key as an app-wide constant
const STORAGE_KEY = "vacation_tracker";

function storeNewVacation(startDate, endDate){
    // get data from storage
    const vacations = getAllStoredVacations();  // returns an array of Strings

    // add new vacation at end of array
    vacations.push({startDate, endDate});

    // sort array by date, new to old
    vacations.sort((a, b)=>{
        return new Date(b.startDate) - new Date(a.startDate);
    });

    // store the new array back in storage
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vacations));
}

function getAllStoredVacations() {
    // get vacation string form local storage
    const data = window.localStorage.getItem(STORAGE_KEY);


    //if no vaca are stored, default ot empty array
    //otherwise return stored data as parsed JSON
    const vacations = data ? JSON.parse(data) : [];

    return vacations;
}

function renderPastVacations() {
    // get parsed string of vacations or an empty array if none
    const vacations = getAllStoredVacations();

    //exit if no vacations
    if(vacations.length === 0){
        return;
    }

    //clear list of past vacations since we're re-rendering it
    pastVacationContainer.innerHTML = "";

    const pastVacationHeader = document.createElement("h2");
    pastVacationHeader.textContent = "Past Vacations";

    const pastVacationList = document.createElement("ul");

    //loop over all vacations and render them
    vacations.forEach((vacation)=>{
        const vacationEl = document.createElement("li");
        vacationEl.textContent = `From ${formatDate(vacation.startDate)} to ${formatDate(vacation.endDate)}`;
        pastVacationList.appendChild(vacationEl);
    });

    pastVacationContainer.appendChild(pastVacationHeader);
    pastVacationContainer.appendChild(pastVacationList);
}

function formatDate(dateString){
    // convert the date to a Date object
    const date = new Date(dateString);

    // format date into locale specific string
    // include your locale for better ux
    return date.toLocaleDateString("en-US", {timeZone: "UTC"});
}

// start app by rendering past vacations on load (if any)
renderPastVacations();

//register service worker (sw.js) with app
if("serviceWorker" in navigator){
    navigator.serviceWorker
        .register("sw.js")
        .then((registration)=>{
            console.log("Service Worker registered with scope:", registration.scope);
        })
        .catch((error)=>{
            console.log("Service Worker registration failed:", error);
        });
}

// //listen for messages from the service worker
// navigator.serviceWorker.addEventListener("message", (event)=>{
//     console.log("Received a message from the Service Worker:", event.data);

//     //handle different message types
//     if(event.data.type === "update"){
//         console.log("Update Received", event.data.data);
//         //update UI or perform some action
//     }
// });

// //function to send a message to Service Worker
// function sendMEssageToSW(message){
//     if (navigator.serviceWorker.controller){ //if client has been claimed
//         navigator.serviceWorker.controller.postMessage(message);
//     }
// }

// document.getElementById("sendButton").addEventListener("click", ()=>{
//     sendMEssageToSW({type: "action", data: "Button Clicked"});
// });

// create a broadcast channel, name here needs to match name in service worker
const channel = new BroadcastChannel("pwa_channel");

// listen for messages
channel.onmessage = (event) => {
    console.log("Received a Message in PWA:", event.data);
    document.getElementById("messages").insertAdjacentHTML("beforeend", `<p>Received: ${event.data}</p>`);
};

//send a message when the button is clicked
document.getElementById("sendButton").addEventListener("click", ()=>{
    const message = "Hello from PWA!";
    channel.postMessage(message);
    console.log("Sent message from PWA:", message);
});
/////////////////////////// 10-11-24 /////////////////////////////
// open or create database
let db;
const dbName = "SyncDatabase";
const request = indexedDB.open(dbName, 1); // doesnt open immediately, generates event
request.onerror = function (event) {
    console.error("Database error: " + event.target.error);
};

request.onsuccess = function (event) {
    // now we have the database
    db = event.target.result;
    console.log("Database opened successfully");
};

request.onupgradeneeded = function (event) {
    db = event.target.result;

    // create any new object stores for db or delete any old ones from prev version
    const objectStore = db.createObjectStore( "pending data", 
        {
            keyPath:"id",
            autoIncrement: true
        }
    );
};

// add data to db, need a transaction to accomplish it
function addDataToIndexedDB(data){ // Promise so that it is done in the background
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["pendingData"], "readwrite"); // 2nd param is mode
        const objectStore = transaction.objectStore("pendingData");
        const request = objectStore.add({data: data});

        request.onsuccess = function (event) {
            resolve();
        };

        request.onerror = function (event) {
            reject("Error storing data: " + event.target.error);
        };

    });
}

document.getElementById("dataForm").addEventListener("submit", function(event){
    event.preventDefault(); // don't send to server, trying to make app work offline
    
    // get data
    const data = document.getElementById("dataInput").value;

    // check if we have serviceWorker AND syncManager available
    if("serveWorker" in navigator && "SyncManager" in window){
        // able to add data to the database for offline persistence
        addDataToIndexedDB(data)
            .then(()=>navigator.serviceWorker.ready) // wait for serviceWorker to be ready
            .then((registration)=>{
                // create a sync event for when device comes online
                return registration.sync.register("send-data");
            })
            .then(()=>{
                // update UI for successful registration, into <div id="status"></div> added to index.html added 10-11
                document.getElementById("status").textContent = "Sync registered. Data will be sent when online.";
            })
            .catch((error)=>{
                console.error("Error: " + error);
            });
    } else {
        //background sync isnt supported try to send immediately
        sendData(data)
            .then((result)=>{
                //update UI
                document.getElementById("status").textContent = result;
            })
            .catch((result)=>{
                //update UI
                document.getElementById("status").textContent = error.message;
            })
    }
});

//simulate sending data
function sendData(data) {
    console.log("Attempting to send data: " + data);

    return new Promise((resolve, reject)=>{
        setTimeout(()=>{
            if(Math.random() > 0.5){
                resolve("Data sent successfully");
            } else {
                reject(new Error("Failed to send data"));
            }
        }, 10000);
    });
}