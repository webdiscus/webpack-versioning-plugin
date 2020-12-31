const myWorker1 = new Worker("/assets/worker1.js");
myWorker1.postMessage(['Message posted to worker.']);

const myWorker2 = new Worker("/assets/worker2.js");
myWorker2.postMessage(['Message posted to worker.']);