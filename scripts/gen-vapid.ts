/* eslint-disable no-console */
import webpush from "web-push";

const k = webpush.generateVAPIDKeys();
console.log("Скопируйте в .env:");
console.log(`VAPID_PUBLIC_KEY="${k.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${k.privateKey}"`);
