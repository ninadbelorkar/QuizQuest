const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

let quizzes = {};  // To store quizzes and their participants

app.use(express.static('public'));

io.on('connection', (socket) => {
    // When a quiz is created
    socket.on('createQuiz', (data) => {
        const roomId = Math.random().toString(36).substring(2, 8);  // Generate unique room ID
        quizzes[roomId] = {
            title: data.title,
            questions: data.questions,
            creator: socket.id,
            participants: []
        };
        socket.join(roomId);
        socket.emit('quizCreated', { roomId });
    });

    // When a user joins a quiz
    socket.on('joinQuiz', (data) => {
        const { roomId, name } = data;
        if (quizzes[roomId]) {
            const room = quizzes[roomId];
            const existingParticipant = room.participants.find(p => p.name === name);
            if (!existingParticipant) {
                room.participants.push({ name, socketId: socket.id, score: null });
                socket.join(roomId);
                socket.emit('quizJoined', { 
                    room: { title: room.title }, 
                    questions: room.questions.map(q => ({ ...q, correctAnswer: undefined })) // Remove correct answer
                });
            } else {
                socket.emit('error', 'This name is already taken in the quiz.');
            }
        } else {
            socket.emit('error', 'Room not found');
        }
    });

    // When a quiz is submitted
    socket.on('submitQuiz', (data) => {
        const { roomId, answers } = data;
        if (quizzes[roomId]) {
            let participant = quizzes[roomId].participants.find(p => p.socketId === socket.id);
            if (participant) {
                participant.score = calculateScore(quizzes[roomId].questions, answers);
                
                // Emit the results only to the participant who submitted
                socket.emit('quizSubmitted', {
                    message: 'Quiz submitted successfully!',
                    score: participant.score
                });

                // Optionally, emit updated results to all participants in the room
                io.to(roomId).emit('quizResults', quizzes[roomId].participants);
            } else {
                socket.emit('error', 'Participant not found');
            }
        } else {
            socket.emit('error', 'Quiz not found');
        }
    });
    
    // Get quiz results
    socket.on('getQuizResults', (roomId) => {
        if (quizzes[roomId]) {
            const results = quizzes[roomId].participants
                .filter(p => p.score !== null)
                .map(p => ({ name: p.name, score: p.score }));
            socket.emit('quizResults', results);
        } else {
            socket.emit('error', 'Quiz not found');
        }
    });
});

// Calculate score
function calculateScore(questions, answers) {
    let score = 0;
    questions.forEach((q, index) => {
        if (q.correctAnswer === answers[index]) {
            score += q.marks || 1; // Use specified marks or default to 1
        }
    });
    return score;
}

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});

