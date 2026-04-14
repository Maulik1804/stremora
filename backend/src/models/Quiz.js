'use strict';

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true, maxlength: 500 },
  options:  { type: [String], required: true, validate: (a) => a.length >= 2 && a.length <= 6 },
  correct:  { type: Number, required: true, min: 0 }, // index into options[]
  explanation: { type: String, default: '' },
}, { _id: true });

const quizSchema = new mongoose.Schema(
  {
    video:     { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true, unique: true, index: true },
    creator:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
    questions: { type: [questionSchema], validate: (a) => a.length >= 1 && a.length <= 10 },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Quiz score submissions
const quizSubmissionSchema = new mongoose.Schema(
  {
    quiz:    { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    video:   { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
    answers: { type: [Number], required: true }, // user's chosen option index per question
    score:   { type: Number, required: true },   // 0–100
    correct: { type: Number, required: true },   // count of correct answers
    total:   { type: Number, required: true },
  },
  { timestamps: true }
);

quizSubmissionSchema.index({ quiz: 1, user: 1 }, { unique: true }); // one attempt per user

module.exports = {
  Quiz: mongoose.model('Quiz', quizSchema),
  QuizSubmission: mongoose.model('QuizSubmission', quizSubmissionSchema),
};
