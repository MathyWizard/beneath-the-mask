// web audio api thingamabobs
// i have a array of audio context sources for each version of the Behind The Mask song
var audioCtx;
var sourceArray = [null, null, null, null];

// these gain nodes will be used to control transitions between tracks
var gainNodeArray = [null, null, null, null];

// holds the AudioBuffers for all songs, in order of:
// 0 - clear day
// 1 - clear night
// 2 - rainy day
// 3 - rainy night
var songBufferArray = [null, null, null, null]

// identifies the current song ID
var currentSongId;

// [TEMPORARY] links to songs
// to bypass CORS error, use http://cors-anywhere.herokuapp.com
const linksToBTMVersions = [
    'http://cors-anywhere.herokuapp.com/https://drive.google.com/uc?export=download&id=1PjBLQYiohhb3NppZiuShK2wNhruXOgs6',
    'http://cors-anywhere.herokuapp.com/https://drive.google.com/uc?export=download&id=14giUGeoZdzmhgeyHuhc4GVboGmDuiRxg',
    'http://cors-anywhere.herokuapp.com/https://drive.google.com/uc?export=download&id=1lWOS8DTEf6bRNI5uhgCZZtHlCw_Dmv3d',
    'http://cors-anywhere.herokuapp.com/https://drive.google.com/uc?export=download&id=1T-jKTf5hF1jCxINXwHNaOH9sOdW3Cyxf'
]

// whether audio is currently playing
var playing = false;

// used to help calculate the current position in the song
var startTime;

// gets web audio api stuff ready
function prepareAudioContext(startSongId) {
    audioCtx = new window.AudioContext();

    // initialize all buffer sources
    for (let i = 0; i < 4; i++) {
        sourceArray[i] = audioCtx.createBufferSource();
    }

    // initialize all gain nodes and connect them to output
    for (let j = 0; j < 4; j++) {
        gainNodeArray[j] = audioCtx.createGain();
        gainNodeArray[j].connect(audioCtx.destination);
    }

    // sets the volume for the start song to 100%
    gainNodeArray[startSongId].gain.value = 1;
}

// actually plays the audio
function initialStart() {
    sourceArray[currentSongId].start();
    startTime = Date.now();
    playing = true;
}

// in milliseconds, since the track started playing (NOT WITHIN THE LOOP)
function getCurrentPosition() {
    return Date.now() - startTime;
}

// loads song based on passed-in song ID
// by default, it is whatever the current song ID is set as
async function loadSong(songId=currentSongId) {
    // make sure that song has not already been loaded
    if (songBufferArray[songId] == null) {
        const arrayBuffer = await fetch(linksToBTMVersions[songId],
        ).then((res) => res.arrayBuffer()).catch(e => {
            console.log(e);
        });
    
        songBufferArray[songId] = await audioCtx.decodeAudioData(arrayBuffer);
    
        // set buffer for downloaded song to proper source
        sourceArray[songId].buffer = songBufferArray[songId]
        sourceArray[songId].loop = true;
        sourceArray[songId].connect(gainNodeArray[songId]);
    
        console.log(`Song ${songId} loaded`)
    }
}

async function loadOtherSongs() {
    // downloads non-downloaded songs one by one
    for (let i = 0; i < 4; i++) {
        if (songBufferArray[i] == null) {
            const arrayBuffer = await fetch(linksToBTMVersions[i],
                ).then((res) => res.arrayBuffer()).catch(e => {
                    console.log(e);
                });
            
            songBufferArray[i] = await audioCtx.decodeAudioData(arrayBuffer);

            // set buffer for downloaded song to proper source
            sourceArray[i].buffer = songBufferArray[i]
            sourceArray[i].loop = true;
            sourceArray[i].connect(gainNodeArray[i]);
        }
    }

    console.log("All songs loaded")
}

// song IDs:
// 0 - clear day
// 1 - clear night
// 2 - rainy day
// 3 - rainy night
// TODO: Transitions seem pretty clean now, but I'll need to keep an eye on them.
function fadeInto(nextSongId) {
    // don't allow a track to fade into itself
    if (currentSongId == nextSongId) {
        return;
    } else {
        // waits until current second is up, then fades songs
        // (i do this because the web audio api only starts playback at full seconds)
        let millsecondsUntilNextSecond = 1000 - (getCurrentPosition() % 1000);

        // console.log("ms until next second: " + millsecondsUntilNextSecond);

        setTimeout(() => { actualFade(nextSongId) }, millsecondsUntilNextSecond);
    }
}

// actually uses the Web Audio API to transition between songs
function actualFade(nextSongId) {
    let currentPosInSeconds = Math.floor(getCurrentPosition() / 1000);

    // setting the gain/volume just to be safe
    gainNodeArray[currentSongId].gain.setValueAtTime(1, audioCtx.currentTime);
    gainNodeArray[nextSongId].gain.setValueAtTime(0, audioCtx.currentTime);

    // fade out current song and fade in next song over 5 seconds
    gainNodeArray[currentSongId].gain.linearRampToValueAtTime(0, currentPosInSeconds + 5);
    gainNodeArray[nextSongId].gain.linearRampToValueAtTime(1, currentPosInSeconds + 5);

    try {  // starting next song
        sourceArray[nextSongId].start(0, currentPosInSeconds);
    } catch {
        // all good. i guess???
        // gonna be honest i cannot remember why i added this try/catch
        // it maybe helped with the transitions??? somehow???
    }

    currentSongId = nextSongId;
}