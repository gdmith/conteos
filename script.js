const clientId = "0fc1abe6ec4a4982995dcbd92a15f85b";
const redirectUri = window.location.origin;

const artists = ["BTS","RM","Jin","Agust D","j-hope","Jimin","V","Jungkook"];

let accessToken = "";

function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(crypto.getRandomValues(new Uint8Array(length)))
        .map(x => possible[x % possible.length]).join('');
}

async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return await crypto.subtle.digest('SHA-256', data);
}

function base64encode(input) {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

async function login() {
    const codeVerifier = generateRandomString(64);
    localStorage.setItem('verifier', codeVerifier);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    const scope = "user-read-private";
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}&code_challenge_method=S256&code_challenge=${codeChallenge}`;

    window.location = authUrl;
}

async function getToken(code) {
    const verifier = localStorage.getItem('verifier');

    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            grant_type: "authorization_code",
            code: code,
            redirect_uri: redirectUri,
            code_verifier: verifier
        })
    });

    const data = await res.json();
    accessToken = data.access_token;
}

async function searchArtist(name) {
    const res = await fetch(`https://api.spotify.com/v1/search?q=${name}&type=artist`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();
    return data.artists.items[0].id;
}

async function getTopTracks(id){
    const res = await fetch(`https://api.spotify.com/v1/artists/${id}/top-tracks?market=US`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();
    return data.tracks;
}

function saveDaily(id, pop){
    const today = new Date().toISOString().split("T")[0];
    const key = id+today;

    if(!localStorage.getItem(key)){
        localStorage.setItem(key, pop);
    }

    const yesterday = new Date(Date.now()-86400000).toISOString().split("T")[0];
    const old = localStorage.getItem(id+yesterday) || pop;

    return pop-old;
}

function display(tracks){
    const c = document.getElementById("songs");
    c.innerHTML="";
    tracks.forEach(t=>{
        const d = saveDaily(t.id, t.popularity);
        c.innerHTML+=`
        <div class="song">
            <h3>${t.name}</h3>
            <p>Popularidad: ${t.popularity}</p>
            <p>Stream diario estimado: ${d}</p>
        </div>`;
    });
}

async function loadArtist(name){
    const id = await searchArtist(name);
    const tracks = await getTopTracks(id);
    display(tracks);
}

function menu(){
    const nav=document.getElementById("artists");
    artists.forEach(a=>{
        const b=document.createElement("button");
        b.textContent=a;
        b.onclick=()=>loadArtist(a);
        nav.appendChild(b);
    });
}

document.getElementById("login").onclick=login;

document.getElementById("search").addEventListener("input", e=>{
    const v=e.target.value.toLowerCase();
    document.querySelectorAll(".song").forEach(s=>{
        s.style.display=s.textContent.toLowerCase().includes(v)?"block":"none";
    });
});

(async()=>{
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if(code){
        await getToken(code);
        menu();
    }
})();
