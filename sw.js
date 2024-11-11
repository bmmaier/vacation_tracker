const VERSION = "v4";

//offline resource list
const APP_STATIC_RESOURCES = [
    "index.html",
    "style.css",
    "app.js",
    "vacationTracker.json",
    "assets/icons/icon-512x512.png"
];

const CACHE_NAME = `vacation-tracker-${VERSION}`;

// handle install event and retrieve and store file listed for cache
self.addEventListener("install", (event)=>{
    event.waitUntil(
        (async()=>{
            const cache = await caches.open(CACHE_NAME);
            cache.addAll(APP_STATIC_RESOURCES);
        })()
    );
});

// use the activate event to delete any old caches so we dont run out of space
// delete all but the current one, then set the service worker as the controller for the app

self.addEventListener("activate", (event)=>{
    event.waitUntil(
        (async() => {
            // get name of existing caches
            const names = await caches.keys();

            // iterate through list and check each to see if current, delete if not
            await Promise.all(
                names.map((name)=>{
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );//promise all

            // use claim() method of client's interface to enable our service worker as the controller
            await clients.claim();

        })()
    );//wait until
});

// use fetch event to intercept requests to server so we can serve up cached pages or respond with error or 404
self.addEventListener("fetch", (event)=>{
    event.respondWith(
        (async ()=>{
            //try to get resource from cache
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse){
                return cachedResponse;
            }

            //if not cahced, try to get from network
            try {
                const networkResponse = await fetch(event.request);

                //cache new response for future use
                cache.put(event.request, networkResponse.clone());
                
                return networkResponse;

            } catch (error){

                console.error("Fetch failed; returning offline page instead.", error);

                // if request is for the page, return index.html as a fallback
                if(event.request.mode === "navigate"){
                    return cache.match("/index.html");
                }

                // for everything else, throw error, might want to return a default offline asset insted
                throw error;

            }

        })()
    );//respondWith
});//fetch

// // send a message to the client - we will use to update data later
// function sendMessageToPWA(){
//     self.clients.matchAll().then((clinets) => {
//         clients.forEach((client) => {
//             client.postMessage(message);
//         });
//     });
// }

// //send message evey 10 seconds, in milliseconds so 10,000 ms = 10 sec
// setInterval(()=>{
//     sendMessageToPWA({type: "update", data: "New data available"});
// }, 10000);

// // listen for messages from the app
// self.addEventListener("message", (event)=>{
//     console.log("Service Worker received a message", event.data);

//     // you can respond back if needed
//     event.source.postMessage({
//         type: "response",
//         data: "Message received by service worker"
//     });
// });

// create a broadcast channel, name here needs to match name in app
const channel = new BroadcastChannel("pwa_channel");

//listen for messages
channel.onmessage = (event) => {
    console.log("Received message in Service Worker: ", event.data);

    //echo message back to pwa
    channel.postMessage("Service Worker received: " + event.data);
};
////////////////////////// 10-11 ////////////////////////////////
// open or create database
let db;
const dbName = "SyncDatabase";
const request = indexedDB.open(dbName, 1); // doesnt open immediately, generates event // name and version needs to match app.js
request.onerror = function (event) {
    console.error("Database error: " + event.target.error);
};

request.onsuccess = function (event) {
    // now we have the database
    db = event.target.result;
    console.log("Database opened successfully in service worker");
};

self.addEventListener("sync", function(event){
    if(event.tag === "send-data"){
        event.waitUntil(sendDataToServer());
    }
});

function sendDataToServer(){
    return getAllPendingData()
        .then(function (datalist){
            return Promise.all(
                dataList.map(function(item){
                    // sim sending data to server
                    return new Promise((resolve, reject) =>{
                        setTimeout(()=>{
                            if(Math.random() > 0.1){
                                // 90% success rate
                                resolve("Data sent successfully");
                            } else {
                                console.log("Failed to send data:", item.data);
                                reject(new Error("Failed to send data"));
                            }
                        }, 1000);
                    })
                    .then(function(){
                        // if successful, remove item from database
                        return removeDataFromIndexDB(item.id);
                    })
                })
            )
        })
}

function getAllPendingData(){
    return new Promise ((resolve, reject) => {
        //transaction to read data from db
        const transaction = db.transaction(["pendingData"], "readOnly");
        const objectStore = transaction.objectStore("pendingData");
        const request =  objectStore.getAll(); //where you get the .onsuccess and .onerror

        request.onsuccess = function(event) {
            resolve(event.target.result);
        };

        //sending back the error message
        request.onerror = function(event) {
            reject("Error fetching data: " + event.target.error);
        }
    })
}

function removeDataFromIndexedDB(id) {
    return new Promise((resolve, reject) => {
          const transaction = db.transaction(["pendingData"], "readwrite");
          const objectStore = transaction.objectStore("pendingData");
          const request = objectStore.delete(id);

           request.onsuccess = function (event) {
                 resolve();
           };

           request.onerror = function (event) {
               reject("Error removing data: " + event.target.error);
          };
      });
}