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
if("ServiceWork" in navigator){
    navigator.serviceWorker
        .register("sw.js")
        .then((registration)=>{
            console.log("Service Worker registered with scope:", registration.scope);
        })
        .catch((error)=>{
            console.log("Service Worker registration failed:", error);
        });
}

//listen for messages from the service worker
navigator.serviceWorker.addEventListener("message", (event)=>{
    console.log("Received a message from the Service Worker:", event.data);

    //handle different message types
    if(event.data.type === "update"){
        console.log("Update Received", event.data.data);
        //update UI or perform some action
    }
});

//function to send a message to Service Worker
function sendMEssageToSW(message){
    if (navigator.serviceWorker.controller){ //if client has been claimed
        navigator.serviceWorker.controller.postMessage(message);
    }
}

document.getElementById("sendButton").addEventListener("click", ()=>{
    sendMEssageToSW({type: "action", data: "Button Clicked"});
});