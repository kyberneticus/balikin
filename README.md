# Balikin

Static Lost & Found campus prototype.

## Deploy to Vercel

Import this repository in Vercel and select **Other** as the framework preset. Vercel runs `npm run build`, which generates the deployable root `index.html` from `src/`.

## Run locally

Generate the standalone build, then open `index.html` in a browser or use a static server:

```sh
npm run build
npx live-server --host=0.0.0.0 --port=8080
```

Use `http://<your-local-IP>:8080` from a phone on the same Wi-Fi network.

## Admin demo

Log in with username `admin` and password `admin123` to view the locker monitoring dashboard.

> This is a visual prototype. Campus identity, notifications, AI, audit logs, sensors, and locker control are not implemented. The admin credentials are public in the client code and must not be used as real access control.
