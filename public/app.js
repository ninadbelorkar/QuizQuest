const socket = io();

socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
});

socket.on('disconnect', () => {
    console.log('Socket disconnected');
});

// Function to create a quiz
function createQuiz() {
    const title = document.getElementById('quizTitle').value;
    const questions = Array.from(document.getElementsByClassName('question')).map(q => {
        return {
            text: q.querySelector('.questionText').value,
            options: Array.from(q.getElementsByClassName('option')).map(o => o.value),
            correctAnswer: parseInt(q.querySelector('.correctAnswer').value) - 1,
            marks: parseInt(q.querySelector('.marks').value) // Include marks for each question
        };
    });

    socket.emit('createQuiz', { title, questions });
}

socket.on('quizCreated', (data) => {
    document.getElementById('roomId').textContent = `Quiz Created! Room ID: ${data.roomId}`;
});

// Function to join a quiz
document.addEventListener('DOMContentLoaded', function () {
    const joinForm = document.getElementById('joinForm');
    if (joinForm) {
        joinForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const roomId = document.getElementById('roomId').value;
            const name = document.getElementById('name').value;

            if (roomId && name) {
                console.log('Emitting joinQuiz event to the server...');
                socket.emit('joinQuiz', { roomId, name });
            } else {
                alert("Please fill in both fields.");
            }
        });
    }
});

// Handle quizJoined event
socket.on('quizJoined', (data) => {
    const { room, questions } = data;
    console.log('Quiz joined:', room, questions);

    if (!questions || questions.length === 0) {
        console.error('No questions received from the server');
        return;
    }

    // Hide the join form
    const joinForm = document.getElementById('joinForm');
    if (joinForm) {
        joinForm.style.display = 'none';
    }

    // Show a message that the quiz was joined successfully
    const messageDiv = document.createElement('div');
    messageDiv.textContent = `Successfully joined quiz: ${room.title}`;
    document.body.appendChild(messageDiv);

    // Display the quiz questions
    const form = document.getElementById('quizForm');
    if (form) {
        form.style.display = 'block';
        form.innerHTML = ''; // Clear any existing content
        questions.forEach((q, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.innerHTML = `<h3>${q.text}</h3>`;
            q.options.forEach((option, i) => {
                questionDiv.innerHTML += `
                    <input type="radio" name="question${index}" value="${i}" required> ${option}<br>
                `;
            });
            form.appendChild(questionDiv);
        });

        // Add submit button
        const submitButton = document.createElement('button');
        submitButton.textContent = 'Submit Quiz';
        submitButton.type = 'button'; // Change to 'button' to prevent form submission
        submitButton.onclick = submitQuiz; // Attach the submitQuiz function
        form.appendChild(submitButton);
    } else {
        console.error('Quiz form element not found');
    }
});

// Function to submit the quiz
function submitQuiz() {
    const answers = Array.from(document.getElementById('quizForm').elements)
        .filter(el => el.checked)
        .map(el => parseInt(el.value));

    if (answers.length === 0) {
        console.error('No answers selected');
        alert('Please select answers for all questions');
        return;
    }

    const roomId = document.getElementById('roomId').value;
    console.log('Submitting quiz for room:', roomId);
    socket.emit('submitQuiz', { roomId, answers });
    console.log('Quiz submitted with answers:', answers);

    // Hide the quiz form
    document.getElementById('quizForm').style.display = 'none';

    // Show a submission message
    const messageDiv = document.createElement('div');
    messageDiv.id = 'submissionMessage';
    messageDiv.textContent = 'Quiz submitted successfully! Waiting for results...';
    document.body.appendChild(messageDiv);
}

// New event listener for quiz submission response
socket.on('quizSubmitted', (data) => {
    console.log('Quiz submitted successfully:', data);
    const { message, score } = data;
    
    // Update the submission message
    const submissionMessage = document.getElementById('submissionMessage');
    if (submissionMessage) {
        submissionMessage.textContent = `${message} Your score: ${score}`;
    }

    // Add a button to return to the home page
    const returnButton = document.createElement('button');
    returnButton.textContent = 'Return to Home';
    returnButton.onclick = () => window.location.href = '/';
    document.body.appendChild(returnButton);
});

// Updated event listener for quiz results
socket.on('quizResults', (participants) => {
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = '<h2>Quiz Results</h2>';

        // Display the results for each participant
        participants.forEach(p => {
            resultsDiv.innerHTML += `<p>${p.name}: ${p.score !== undefined ? p.score : 'Not submitted'} points</p>`;
        });
        resultsDiv.style.display = 'block';

        // Remove the submission message if it exists
        const submissionMessage = document.getElementById('submissionMessage');
        if (submissionMessage) {
            submissionMessage.remove();
        }
    } else {
        console.error('Results div not found');
    }
});

// Listen for errors
socket.on('error', (message) => {
    console.error('Error:', message);
    alert(message);
});

// New function to view quiz results
function viewResults() {
    const roomId = document.getElementById('resultRoomId').value;
    if (roomId) {
        socket.emit('getQuizResults', roomId);
    } else {
        alert('Please enter a valid Room ID');
    }
}

// Additional utility functions

// Function to add a new question input to the quiz creation form
function addQuestion() {
    const questionsContainer = document.getElementById('questionsContainer');
    const questionNumber = questionsContainer.children.length + 1;

    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';
    questionDiv.innerHTML = `
        <h3>Question ${questionNumber}</h3>
        <input type="text" class="questionText" placeholder="Enter question" required>
        <input type="text" class="option" placeholder="Option 1" required>
        <input type="text" class="option" placeholder="Option 2" required>
        <input type="text" class="option" placeholder="Option 3" required>
        <input type="text" class="option" placeholder="Option 4" required>
        <input type="number" class="correctAnswer" placeholder="Correct answer (1-4)" min="1" max="4" required>
    `;

    questionsContainer.appendChild(questionDiv);
}

// Function to join a quiz
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('joinForm')?.addEventListener('submit', function (e) {
        e.preventDefault();
        const roomId = document.getElementById('roomId').value;
        const name = document.getElementById('name').value;

        if (roomId && name) {
            socket.emit('joinQuiz', { roomId, name });
        } else {
            alert("Please fill in both fields.");
        }
    });
});

// Listen for 'quizJoined' event from the server
socket.on('quizJoined', (data) => {
    const { room, questions } = data;

    // Hide the join form and headline
    const joinForm = document.getElementById('joinForm');
    if (joinForm) {
        joinForm.style.display = 'none';  // Hide the join form
    }

    // Show a success message
    const messageDiv = document.createElement('div');
    messageDiv.textContent = `Successfully joined quiz: ${room.title}`;
    document.body.appendChild(messageDiv);

    // Show the quiz questions
    const form = document.getElementById('quizForm');
    if (form) {
        form.style.display = 'block';  // Show the quiz form
        form.innerHTML = '';  // Clear any previous content

        questions.forEach((q, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.innerHTML = `<h3>${q.text}</h3>`;
            q.options.forEach((option, i) => {
                questionDiv.innerHTML += `
                    <input type="radio" name="question${index}" value="${i}" required> ${option}<br>
                `;
            });
            form.appendChild(questionDiv);
        });

        // Add submit button to the form
        const submitButton = document.createElement('button');
        submitButton.textContent = 'Submit Quiz';
        submitButton.type = 'submit';
        form.appendChild(submitButton);
//this new
        // Add event listener for quiz submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const answers = Array.from(document.getElementById('quizForm').elements)
                .filter(el => el.checked)
                .map(el => parseInt(el.value));

            if (answers.length === 0) {
                console.error('No answers selected');
                alert('Please select answers for all questions');
                return;
            }

            const roomId = document.getElementById('roomId').value;
            socket.emit('submitQuiz', { roomId, answers });
            console.log('Quiz submitted with answers:', answers);
        });
    } else {
        console.error('Quiz form element not found');
    }
//this new
});

// Function to submit the quiz answers
function submitQuiz(e) {
    e.preventDefault();
    const answers = Array.from(document.getElementById('quizForm').elements)
        .filter(el => el.checked)
        .map(el => parseInt(el.value));
//this new
    if (answers.length === 0) {
        console.error('No answers selected');
        alert('Please select answers for all questions');
        return;
    }
//this new
    // Emit the 'submitQuiz' event to the server with the user's answers
    const roomId = document.getElementById('roomId').value;
    console.log('Submitting quiz for room:', roomId);
    socket.emit('submitQuiz', { roomId, answers });
    console.log('Quiz submitted with answers:', answers);

    // Hide the quiz form
    document.getElementById('quizForm').style.display = 'none';

    // Show a submission message
    const messageDiv = document.createElement('div');
    messageDiv.id = 'submissionMessage';
    messageDiv.textContent = 'Quiz submitted successfully! Waiting for results...';
    document.body.appendChild(messageDiv);
}

//Add a new event listener for quizSubmitted
socket.on('quizSubmitted', (data) => {
    console.log('Quiz submitted successfully:', data);
    const { message, score } = data;
    
    // Update the submission message
    const submissionMessage = document.getElementById('submissionMessage');
    if (submissionMessage) {
        submissionMessage.textContent = `${message} Your score: ${score}`;
    }

    // Redirect to home page after a short delay
    setTimeout(() => {
        window.location.href = '/';
    }, 3000);
});

// Viewing quiz results: Add a new function in app.js to handle viewing results:
function viewResults() {
    const roomId = document.getElementById('resultRoomId').value;
    if (roomId) {
        socket.emit('getQuizResults', roomId);
    } else {
        alert('Please enter a valid Room ID');
    }
}

socket.on('quizResults', (results) => {
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = '<h2>Quiz Results</h2>';
        results.forEach(participant => {
            resultsDiv.innerHTML += `<p>${participant.name}: ${participant.score} points</p>`;
        });
        resultsDiv.style.display = 'block';
    } else {
        console.error('Results div not found');
    }
});


// Listen for the 'quizResults' event from the server
socket.on('quizResults', (participants) => {
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = '<h2>Quiz Results</h2>';  // Clear previous results and add a header

        // Display the results for each participant
        participants.forEach(p => {
            resultsDiv.innerHTML += `<p>${p.name}: ${p.score !== undefined ? p.score : 'Not submitted'} points</p>`;
        });
        resultsDiv.style.display = 'block';

        // Remove the submission message if it exists
        const submissionMessage = document.getElementById('submissionMessage');
        if (submissionMessage) {
            submissionMessage.remove();
        }
    } else {
        console.error('Results div not found');
    }
});

// Listen for quiz submission errors
socket.on('quizSubmissionError', (message) => {
    console.error('Quiz submission error:', message);
    alert('Error submitting quiz: ' + message);
    // Re-enable the quiz form in case of an error
    const quizForm = document.getElementById('quizForm');
    if (quizForm) {
        quizForm.style.display = 'block';
    }
    const submissionMessage = document.getElementById('submissionMessage');
    if (submissionMessage) {
        submissionMessage.remove();
    }
});

// Listen for errors
socket.on('error', (message) => {
    console.error('Error:', message);
    alert(message);
});

