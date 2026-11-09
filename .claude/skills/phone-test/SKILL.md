---
name: phone-test
description: Put a branch on Filipe's phone. Starts Expo on his Windows PC (Station-Fi) in a visible terminal tab and sends him the exp:// address to open in Expo Go. Use for "test it on my phone", "start Expo", "send me the link", and after a PR is built.
---

# Test a branch on Filipe's phone

Filipe tests in Expo Go on his phone and shouldn't have to go to the PC. You start Expo on his Windows PC, Station-Fi, and send him the address.

## Rules

- **Station-Fi only**, the clone at `C:\Users\fiton\Documents\projects\labirinto-de-cristal`. If a session or approval opens on another machine (the Mac WS-23183 did once), stop it and start again on Station-Fi. Check which device actually started before you go on.
- **Never start Expo as a hidden background job.** Always use `scripts/open-expo-window.ps1`, which opens a visible Windows Terminal tab so Filipe sees the address, the QR code and the log. It stops this project's old Expo and ngrok first.
- To judge speed, use the default production-like build. `-Dev` is 5 to 10 times slower and is only for debugging.

## Steps

1. Reach Station-Fi. From a cloud thread, start a Remote Control session on Station-Fi (the project's default device), in the clone folder above. In a session already running there, work directly.
2. Check out the branch. These commands are pre-approved in `.claude/settings.json`:
   ```
   git fetch origin <branch>
   git checkout -B <branch> origin/<branch>
   ```
   Then run `npm install` if `package.json` or `package-lock.json` changed since the last run.
3. Start Expo:
   ```
   powershell -ExecutionPolicy Bypass -File scripts/open-expo-window.ps1
   ```
   This uses the ngrok tunnel, which works from any network.
4. Find the address and send it. The tunnel address is `exp://<name>.exp.direct`. It appears in the new tab once the tunnel connects (give it 20 to 40 s). If you can't read the tab, ngrok's local page `http://127.0.0.1:4040/api/tunnels` lists it under `public_url` (swap `https://` for `exp://`). Send Filipe the exp:// address, which branch and commit it serves, and a short list of what to try.
5. If Expo Go shows an old version (the tunnel has served a stale cached copy before) or the tunnel won't connect, restart on the home network instead:
   ```
   powershell -ExecutionPolicy Bypass -File scripts/open-expo-window.ps1 -Lan
   ```
   The address is `exp://<PC's IPv4 address>:8081`, which was `exp://192.168.15.18:8081`. Check the address with `ipconfig`. It works only while the phone is on the same Wi-Fi. If the old version still shows, Filipe should force-stop Expo Go or clear its cache, then type the address in again.

When Filipe is done, leave Expo running. The next run of the script stops it.
