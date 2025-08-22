// Voice Input/Output
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let voiceOutputEnabled = false;

// Initialize voice input button
const voiceInputBtn = document.getElementById('voiceInputBtn');
const voiceOutputBtn = document.getElementById('voiceOutputBtn');

voiceInputBtn.addEventListener('click', async () => {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('audio', audioBlob);
                
                try {
                    const response = await fetch('/speech-to-text', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    if (data.text) {
                        document.getElementById('userInput').value = data.text;
                        sendMessage();
                    }
                } catch (error) {
                    console.error('Error converting speech to text:', error);
                }
            };
            
            mediaRecorder.start();
            isRecording = true;
            voiceInputBtn.classList.add('recording');
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    } else {
        mediaRecorder.stop();
        isRecording = false;
        voiceInputBtn.classList.remove('recording');
    }
});

// Voice output toggle
voiceOutputBtn.addEventListener('click', () => {
    voiceOutputEnabled = !voiceOutputEnabled;
    voiceOutputBtn.classList.toggle('active');
});

// Theme customization
const themeColors = document.querySelectorAll('.theme-color');
themeColors.forEach(color => {
    color.addEventListener('click', () => {
        const theme = color.dataset.theme;
        document.documentElement.setAttribute('data-theme', theme);
        themeColors.forEach(c => c.classList.remove('active'));
        color.classList.add('active');
    });
});

// Confetti animation
function triggerConfetti() {
    const container = document.getElementById('confettiContainer');
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        container.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

// Modify the existing sendMessage function to include voice output and confetti
async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    
    if (message) {
        addMessage(message, 'user');
        userInput.value = '';
        
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    voice_output: voiceOutputEnabled
                })
            });
            
            const data = await response.json();
            
            if (data.audio && voiceOutputEnabled) {
                const audio = new Audio('data:audio/mp3;base64,' + data.audio);
                audio.play();
            }
            
            addMessage(data.response, 'bot');
            
            // Trigger confetti for first message or special responses
            if (message.toLowerCase().includes('thank') || message.toLowerCase().includes('thanks')) {
                triggerConfetti();
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage('Sorry, there was an error processing your request.', 'bot');
        }
    }
}

// Add confetti styles
const style = document.createElement('style');
style.textContent = `
    .confetti {
        position: absolute;
        width: 10px;
        height: 10px;
        background-color: #f00;
        animation: fall linear forwards;
    }
    
    @keyframes fall {
        0% {
            transform: translateY(-100vh) rotate(0deg);
        }
        100% {
            transform: translateY(100vh) rotate(360deg);
        }
    }
`;
document.head.appendChild(style); 