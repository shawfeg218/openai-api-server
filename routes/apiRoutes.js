// file: routes\apiRoutes.js
const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");
const audioChatController = require("../controllers/audioChatController");
const multer = require("multer");
const upload = multer();

router.post("/v1/transcript-audio", upload.single("file"), audioChatController.transcriptAudio);

router.post("/v1/audio-chat", audioChatController.audioChat);

router.post("/v1/tti", audioChatController.tti);

router.post("/v1/tts", audioChatController.tts);

router.post("/v1/video-translate", videoController.translateVideo);

router.post("/v1/content-learning", videoController.contentLearning);

module.exports = router;
