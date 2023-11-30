// file: controllers/videoController.js
const videoService = require('../services/videoService');
const chatService = require('../services/chatService');

exports.translateVideo = async (req, res) => {
  // const apiKey = req.body.apiKey;
  const videoUrl = req.body.videoUrl;

  try {
    const transcription = await videoService.transcribeVideo(videoUrl);
    console.log('Transcription completed!');

    const translation = await videoService.translateTranscription(transcription);
    console.log('Translation completed!');

    const data = {
      transcription: transcription,
      translation: translation,
    };

    res.json(data);
  } catch (error) {
    // console.log(error);
    const errorResponse = {
      name: error.name,
      message: error.message,
    };

    res.status(500).json(errorResponse);
  }
};

exports.contentLearning = async (req, res) => {
  // const apiKey = req.body.apiKey;
  const content = req.body.content;
  const voiceLang = 'zh-TW';
  const voiceName = 'zh-TW-YunJheNeural';

  try {
    const answer = await videoService.contentChat(content);
    console.log('Answer completed!');

    const answerAudio = await chatService.textToSpeech(answer, voiceLang, voiceName);
    console.log('Answer audio completed!');

    const data = {
      answer: answer,
      answerAudio: answerAudio,
    };

    res.json(data);
  } catch (error) {
    // console.log(error);
    const errorResponse = {
      name: error.name,
      message: error.message,
    };

    res.status(500).json(errorResponse);
  }
};
