// ======================= Firebase Config =======================
const firebaseConfig = {
    apiKey: "AIzaSyAVUxyWwAuY_ZnwjFC9WZp1NVp1l815a4c",
    authDomain: "yari-online.firebaseapp.com",
    databaseURL: "https://yari-online-default-rtdb.firebaseio.com",
    projectId: "yari-online",
    storageBucket: "yari-online.firebasestorage.app",
    messagingSenderId: "503368361126",
    appId: "1:503368361126:web:09028d371b17372e320067",
    measurementId: "G-8DKYZSNHHS"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ======================= پرسیارەکان =======================
const questions = [
    {text:"چیایەکی بەرزی کوردستان؟",options:["جودی","ئارارات","هەندرێن","شەهیدان"],correct:1},
    {text:"کام شار بە 'شاری هەوری سپی' ناسراوە؟",options:["سلێمانی","ھەولێر","دھۆک","کەرکووک"],correct:0},
    {text:"نەورۆز لە کام ڕۆژدا دەست پێ دەکات؟",options:["20 ئادار","21 ئادار","22 ئادار","23 ئادار"],correct:1},
    {text:"کام جۆرە ئاگرین لە نان خواردندا باوە؟",options:["گاز","موزەلەق (نەوت)","کارەبا","دار"],correct:1},
    {text:"هەرێمی کوردستان چەند پارێزگای هەیە؟",options:["3","4","5","6"],correct:1},
    {text:"کام براندی مۆبایل زۆر بەکار دەهێنرێت؟",options:["ئایفۆن","سامسۆنگ","هواوی","شیاومی"],correct:1},
    {text:"ڕەنگی ئاڵای کوردستان چەند ڕەنگە؟",options:["3","4","5","2"],correct:1},
    {text:"چەمچەماڵ بە چی ناسراوە؟",options:["قەڵا","ئاوی گەرم","بازاڕ","گردەکان"],correct:0},
    {text:"کام پلاتفۆرم بۆ ڤیدیۆ کورت زۆر باوە؟",options:["یوتیوب","فیسبوک","تیکتۆک","ئینستاگرام"],correct:2},
    {text:"دەریاچەی وەرمێ لە کام وڵاتدایە؟",options:["ئێران","تورکیا","عێراق","سوریا"],correct:0}
];

let currentUser = localStorage.getItem('currentUser');
const users = {"مەڕوا":"1234","محمد":"1234","ئەشڕەف":"1234","ژوان":"1234"};
if(!currentUser || !users[currentUser]) window.location.href = 'login.html';
document.getElementById('userInfo').innerHTML = `👤 ${currentUser}`;

let currentRoomId = null;
let playerNumber = null;
let currentQIndex = 0;
let scores = {1:0,2:0};
let timeLeft = 30;
let timerInterval = null;
let canAnswer = true;
let answered = false;

const roomSection = document.getElementById('roomSection');
const waitingSection = document.getElementById('waitingSection');
const gameSection = document.getElementById('gameSection');
const player1Score = document.getElementById('player1Score');
const player2Score = document.getElementById('player2Score');
const player1Name = document.getElementById('player1Name');
const player2Name = document.getElementById('player2Name');
const gameStatusMsg = document.getElementById('gameStatusMsg');

function generateRoomId(){
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

document.getElementById('createRoomBtn').onclick = async () => {
    const roomId = generateRoomId();
    currentRoomId = roomId;
    playerNumber = 1;
    
    await database.ref('rooms/' + roomId).set({
        player1: currentUser,
        player2: null,
        player1Score: 0,
        player2Score: 0,
        status: 'waiting',
        currentQuestion: 0,
        createdAt: Date.now()
    });
    
    roomSection.style.display = 'none';
    waitingSection.style.display = 'block';
    document.getElementById('roomCodeDisplay').innerText = roomId;
    document.getElementById('waitingStatus').innerHTML = 'چاوەڕێی یاریزانی دووەم...';
    
    listenForPlayer2(roomId);
};

document.getElementById('joinRoomBtn').onclick = async () => {
    const roomId = document.getElementById('joinRoomInput').value.trim().toUpperCase();
    if(!roomId) return;
    
    const roomRef = database.ref('rooms/' + roomId);
    const snapshot = await roomRef.get();
    const room = snapshot.val();
    
    if(room && room.status === 'waiting' && !room.player2){
        currentRoomId = roomId;
        playerNumber = 2;
        await roomRef.update({ player2: currentUser, status: 'ready' });
        
        roomSection.style.display = 'none';
        waitingSection.style.display = 'block';
        document.getElementById('roomCodeDisplay').innerText = roomId;
        document.getElementById('waitingStatus').innerHTML = '✅ پەیوەندی بەسترا! چاوەڕێی دەستپێکردنی یاری...';
        
        listenForGameStart(roomId);
    } else {
        alert('کۆدی ژوورەکە هەڵەیە!');
    }
};

function listenForPlayer2(roomId){
    database.ref('rooms/' + roomId).on('value', (snapshot) => {
        const room = snapshot.val();
        if(room && room.player2 && room.status === 'ready'){
            document.getElementById('waitingStatus').innerHTML = '🎉 یاریزانی دووەم پەیوەندی بەست! کلیک لە دەستپێکردن بکە. 🎉';
            document.getElementById('startGameBtn').style.display = 'block';
        }
    });
}

function listenForGameStart(roomId){
    database.ref('rooms/' + roomId).on('value', (snapshot) => {
        const room = snapshot.val();
        if(room && room.status === 'playing'){
            startGame(room);
        }
    });
}

document.getElementById('startGameBtn').onclick = async () => {
    await database.ref('rooms/' + currentRoomId).update({ status: 'playing' });
    const snapshot = await database.ref('rooms/' + currentRoomId).get();
    startGame(snapshot.val());
};

document.getElementById('cancelBtn').onclick = () => {
    if(currentRoomId) database.ref('rooms/' + currentRoomId).remove();
    window.location.href = 'index.html';
};

function startGame(room){
    scores[1] = room.player1Score || 0;
    scores[2] = room.player2Score || 0;
    player1Name.innerText = room.player1;
    player2Name.innerText = room.player2;
    player1Score.innerText = scores[1];
    player2Score.innerText = scores[2];
    
    roomSection.style.display = 'none';
    waitingSection.style.display = 'none';
    gameSection.style.display = 'block';
    
    loadQuestion();
}

function loadQuestion(){
    const q = questions[currentQIndex];
    document.getElementById('questionText').innerHTML = q.text;
    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';
    q.options.forEach((opt,idx)=>{
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `${String.fromCharCode(65+idx)} - ${opt}`;
        btn.onclick = () => submitAnswer(idx);
        container.appendChild(btn);
    });
    canAnswer = true;
    answered = false;
    startTimer(30);
}

function startTimer(seconds){
    if(timerInterval) clearInterval(timerInterval);
    timeLeft = seconds;
    document.getElementById('timerDisplay').innerHTML = `⏱️ ${timeLeft}`;
    timerInterval = setInterval(()=>{
        if(timeLeft <= 1){
            clearInterval(timerInterval);
            if(canAnswer && !answered) autoTimeout();
        } else {
            timeLeft--;
            document.getElementById('timerDisplay').innerHTML = `⏱️ ${timeLeft}`;
        }
    },1000);
}

function submitAnswer(selected){
    if(!canAnswer || answered) return;
    answered = true;
    canAnswer = false;
    const correct = questions[currentQIndex].correct;
    if(selected === correct) scores[playerNumber]++;
    
    player1Score.innerText = scores[1];
    player2Score.innerText = scores[2];
    
    database.ref('rooms/'+currentRoomId+'/answers/'+playerNumber).set({
        selected: selected,
        score: scores[playerNumber]
    });
    
    checkBothAnswered();
}

function autoTimeout(){
    answered = true;
    canAnswer = false;
    database.ref('rooms/'+currentRoomId+'/answers/'+playerNumber).set({
        selected: -1,
        score: scores[playerNumber]
    });
    checkBothAnswered();
}

function checkBothAnswered(){
    database.ref('rooms/'+currentRoomId+'/answers').once('value', (snapshot) => {
        const answers = snapshot.val();
        if(answers && answers[1] && answers[2]){
            clearInterval(timerInterval);
            const correct = questions[currentQIndex].correct;
            if(answers[1].selected === correct) scores[1] = answers[1].score;
            if(answers[2].selected === correct) scores[2] = answers[2].score;
            player1Score.innerText = scores[1];
            player2Score.innerText = scores[2];
            
            database.ref('rooms/'+currentRoomId).update({
                player1Score: scores[1],
                player2Score: scores[2]
            });
            
            setTimeout(()=>{
                currentQIndex++;
                if(currentQIndex < questions.length){
                    loadQuestion();
                    database.ref('rooms/'+currentRoomId+'/answers').remove();
                } else {
                    endGame();
                }
            }, 3000);
        }
    });
}

function endGame(){
    gameStatusMsg.innerHTML = `🎊 کۆتایی یاری! ئەنجام: ${scores[1]} - ${scores[2]} 🎊`;
    document.getElementById('optionsContainer').innerHTML = '';
    if(timerInterval) clearInterval(timerInterval);
}

document.getElementById('leaveGameBtn').onclick = () => {
    if(confirm('دڵنیایت لە دەرچون؟')){
        if(currentRoomId) database.ref('rooms/'+currentRoomId).remove();
        window.location.href = 'index.html';
    }
};