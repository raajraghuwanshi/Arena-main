# Deploying to Render

The whole app (React client, REST API and Socket.IO) runs as **one Render Web Service**. The database is **MongoDB Atlas**, because Render doesn't offer managed MongoDB.

## 1. Create the database (MongoDB Atlas, free tier is fine)

1. Sign in at https://cloud.mongodb.com and create a free **M0** cluster. Pick a region near your Render region (Singapore / Mumbai).
2. **Database Access → Add user** with a username and password.
3. **Network Access → Add IP address → `0.0.0.0/0`**. Render's outgoing IPs change, so this is needed. Access is still protected by the user and password.
4. **Connect → Drivers**, then copy the connection string and add a database name before the `?`:

   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/buzz_or_lose?retryWrites=true&w=majority
   ```

## 2. Put the code on GitHub

Render deploys from a Git repository. `server/.env`, `node_modules` and the build output are already excluded by `.gitignore`.

```powershell
git init
```

```powershell
git add .
```

```powershell
git commit -m "Buzz or Lose – The Arena"
```

Create an **empty** repository on GitHub (private is fine), then:

```powershell
git remote add origin https://github.com/<your-account>/<repo>.git
```

```powershell
git branch -M main
```

```powershell
git push -u origin main
```

## 3. Create the service on Render (Blueprint)

1. In the Render dashboard, go to **New → Blueprint** and choose the repository. Render reads `render.yaml`.
2. Fill in the values it asks for:
   - `MONGO_URI`: the Atlas string from step 1.
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD`: your host login. The account is created automatically on first start.
   - `JWT_SECRET` is generated for you.
   - `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY` and `IMAGEKIT_URL_ENDPOINT`: your ImageKit API credentials and delivery endpoint. These are required for custom audio and Grand Final video uploads.
3. Click **Apply**. The first build takes a few minutes. When it finishes, the app is live at `https://buzz-or-lose-arena.onrender.com` (or similar).

| URL | Who uses it |
|---|---|
| `/admin` | Host (sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`) |
| `/arena/live` | Projector / audience screen |
| `/buzz/left?key=…`, `/buzz/right?key=…` | Podium buzzers (links in **Settings → Podium buzzers**) |

### Plan choice

`render.yaml` uses the **Starter** plan with a 5 GB **persistent disk** mounted at `/var/data`.

- **Free plan:** the service **sleeps after 15 minutes without traffic**. The next visitor then waits about a minute while it wakes. New custom sounds and Grand Final videos are stored in ImageKit and persist without a Render disk. Removing the disk can make any older files previously stored under `/uploads` unavailable.
- **Starter:** always on. The Render disk preserves older locally stored uploads; current uploads are stored in ImageKit.

### Settings the blueprint applies

| Setting | Value |
|---|---|
| Build | `npm run render-build`: installs server and client, then builds the React app |
| Start | `npm start`: starts the Node server, which also serves the built client |
| Health check | `/api/health` |
| Node | 22 (`.node-version`) |

### Created the service manually instead of with a Blueprint?

Under **Settings → Build & Deploy**, set these, then click **Manual Deploy → Clear build cache & deploy**:

| Setting | Value |
|---|---|
| Root Directory | *(leave empty)* |
| Build Command | `npm run render-build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Under **Environment**, add `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` (any long random text), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY` and `IMAGEKIT_URL_ENDPOINT`.

If the site shows **"Cannot GET /"** or **"The server is running, but the website was not built"**, the Build Command is still `npm install`.

## 4. Load your data

- **Teams and questions:** import them on the live site (**Teams → Import**, **Questions → Import CSV / Excel**). Or seed the sample data from your laptop against Atlas:

  ```powershell
  $env:MONGO_URI = "mongodb+srv://…/buzz_or_lose?…"; npm run seed
  ```

  (`npm run seed -- --reset` wipes teams, questions and competitions first.)
- Local and Render data are separate: your local `buzz_or_lose` database is **not** copied to Atlas. To move it, run `mongodump` locally and `mongorestore --uri "<atlas uri>"`.

## Hosting the client on Vercel

Socket.IO needs a persistent Node server; Vercel's serverless client deployment is not the Socket.IO server. Keep the backend on Render and configure the separate Vercel client to connect directly to it:

1. In the Render service's **Environment**, set `CLIENT_ORIGIN` to your exact Vercel site origin (for example, `https://arena-main-neon.vercel.app`). For multiple client origins, separate them with commas.
2. In Vercel's project **Environment Variables**, set `VITE_API_URL` to the Render service's origin (for example, `https://buzz-or-lose-arena.onrender.com`), with no trailing slash and no `/api`.
3. Redeploy both services so the CORS and client build-time settings take effect.

Without `VITE_API_URL`, the client uses its own origin for API and Socket.IO connections, which only works when the backend is served from that same origin.

## Event-day checklist

- Open `/admin` and `/arena/live` once before the audience arrives, so a free-plan service has woken up.
- Click once on the projector page to enable sound and video playback.
- Copy the podium buzzer links from **Settings** onto the phones or tablets.
- Large video uploads go over the venue internet, so upload them as soon as teams hand them in, or use links.
- Tournament state is saved in Atlas, and uploaded audio/videos are stored in ImageKit. If Render restarts mid-battle, screens reconnect and the battle continues where it stopped.
