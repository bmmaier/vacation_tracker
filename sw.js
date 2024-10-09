const VERSION = "v2";

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

// send a message to the client - we will use to update data later
function sendMessageToPWA(){
    self.clients.matchAll().then((clinets) => {
        clients.forEach((client) => {
            client.postMessage(message);
        });
    });
}

//send message evey 10 seconds, in milliseconds so 10,000 ms = 10 sec
setInterval(()=>{
    sendMessageToPWA({type: "update", data: "New data available"});
}, 10000);

// listen for messages from the app
self.addEventListener("message", (event)=>{
    console.log("Service Worker received a message", event.data);

    // you can respond back if needed
    event.source.postMessage({
        type: "response",
        data: "Message received by service worker"
    });
});