// file: services\chatService.js

const { OpenAIApi, Configuration } = require("openai");
const FormData = require("form-data");
const fetch = require("node-fetch");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
ffmpeg.setFfmpegPath(ffmpegPath);
const { Readable } = require("stream");
const { v4: uuidv4 } = require("uuid");
// const textToSpeech = require('@google-cloud/text-to-speech');
// const speechClient = new textToSpeech.TextToSpeechClient({
//   keyFilename: './meme-bot-391406-47b18ce0fb21.json',
// });
const MicrosoftSpeech = require("microsoft-cognitiveservices-speech-sdk");
const openaiKey = process.env.OPENAI_API_KEY;
const configuration = new Configuration({ apiKey: openaiKey });
const openai = new OpenAIApi(configuration);

function convertAudio(audioStream, uuid) {
  return new Promise((resolve, reject) => {
    const tempFile = `temp/tempFile-${uuid}`;
    const outputFile = `temp/outputFile-${uuid}.mp3`;
    audioStream.pipe(fs.createWriteStream(tempFile));
    ffmpeg(tempFile)
      .outputFormat("mp3")
      .save(outputFile)
      .on("end", () => {
        fs.unlinkSync(tempFile, (err) => {
          if (err) {
            console.log("Error in delete temp file");
          }
        });
        resolve(outputFile);
      })
      .on("error", () => {
        console.log("Error in convertAudio");
        reject();
      });
  });
}

const bufferToStream = (buffer) => {
  return Readable.from(buffer);
};

exports.speechToText = async (audioFile) => {
  try {
    const audioStream = bufferToStream(audioFile.buffer);
    const uuid = uuidv4();
    await convertAudio(audioStream, uuid);
    const convertedAudioStream = fs.createReadStream(`temp/outputFile-${uuid}.mp3`);
    const formData = new FormData();
    formData.append("file", convertedAudioStream, {
      filename: "audio.mp3",
      contentType: "audio/mpeg",
    });
    formData.append("model", "whisper-1");
    formData.append("response_format", "json");
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    fs.unlink(`temp/outputFile-${uuid}.mp3`, (err) => {
      if (err) {
        console.log(`Error in delete outputFile-${uuid}.mp3`);
      }
    });

    if (!response.ok) {
      const { error } = await response.json();
      throw {
        name: "Whisper APIError",
        message: error?.message || "Unknown error",
      };
    }
    const responseJson = await response.json();
    const responseText = responseJson.text;
    console.log(responseText);
    return responseText;
  } catch (error) {
    // console.error('Error in transcribeVideo:', error);
    throw error;
  }
};

exports.chat = async (prompt, messages) => {
  // console.log(openaiKey);
  try {
    const response = await openai.createChatCompletion({
      // model: 'gpt-4',
      model: "ft:gpt-3.5-turbo-0613:tku-ethci-lab::8NgJXXCJ",
      messages: [
        {
          role: "system",
          content: prompt,
        },
        ...messages,
      ],
    });

    const { data } = response;
    // console.log('Data: ', data);
    // console.log(data.choices[0].message);

    return data.choices[0].message.content;
  } catch (error) {
    if (error.response) {
      throw {
        name: "APIError",
        message: error.response.data.error.message,
      };
    } else {
      throw {
        name: "UnknownError",
        message: error.message,
      };
    }
  }
};

exports.textToSpeech = async (text, voiceLang, voiceName) => {
  const uniqueFileName = `output-${uuidv4()}.mp3`;
  try {
    var speechConfig = MicrosoftSpeech.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY,
      "eastus"
    );

    speechConfig.speechSynthesisLanguage = voiceLang;
    speechConfig.speechSynthesisVoiceName = voiceName;
    speechConfig.speechSynthesisOutputFormat =
      MicrosoftSpeech.SpeechSynthesisOutputFormat.Audio16Khz64KBitRateMonoMp3;

    var audioConfig = MicrosoftSpeech.AudioConfig.fromAudioFileOutput(uniqueFileName);

    var synthesizer = new MicrosoftSpeech.SpeechSynthesizer(speechConfig, audioConfig);

    await new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        (result) => {
          synthesizer.close();
          resolve(result);
        },
        (error) => {
          synthesizer.close();
          reject(error);
        }
      );
    });

    // check if file has been finished writing by checking the file size
    let isFinished = false;
    let prevSize = fs.statSync(uniqueFileName).size;
    await new Promise((resolve) => setTimeout(resolve, 500));
    let currentSize = fs.statSync(uniqueFileName).size;

    while (isFinished === false) {
      if (currentSize === prevSize) {
        isFinished = true;
      }
      prevSize = currentSize;
      currentSize = fs.statSync(uniqueFileName).size;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const audioContent = fs.readFileSync(uniqueFileName);
    const audioContentBase64 = Buffer.from(audioContent).toString("base64");
    return audioContentBase64;
  } catch (error) {
    console.log("Error in textToSpeech:", error);
    throw error;
  } finally {
    if (fs.existsSync(uniqueFileName)) {
      fs.unlinkSync(uniqueFileName);
    }
  }
};

// exports.textToImage = async (prompt) => {
//   try {
//     console.log('prompt: ', prompt);
//     const response = await fetch('http://163.13.201.153:7860/sdapi/v1/txt2img', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         prompt: prompt,
//         width: 256,
//         height: 256,
//         cfg_scale: 30,
//       }),
//     });

//     if (!response.ok) {
//       throw {
//         name: 'APIError',
//         message: 'Stable Diffusion API Error',
//       };
//     }

//     const data = await response.json();
//     const imgString = data.images[0];
//     //    console.log('imgString: ', imgString);
//     return imgString;
//   } catch (error) {
//     console.log('error in ttI: ', error);
//     throw {
//       name: 'Text2imageError',
//       message: error.message,
//     };
//   }
// };

// DALL-E image generation
exports.textToImage = async (text) => {
  try {
    const response = await openai.createImage({
      prompt: text,
      n: 1,
      size: "256x256",
    });
    const imgUrl = response.data.data[0].url;
    // console.log('imgUrl: ',imgUrl);
    return imgUrl;
  } catch (error) {
    console.log("error in ttI: ", error);
    if (error.response) {
      throw {
        name: "APIError",
        message: error.response.data,
      };
    } else {
      throw {
        name: "UnknownError",
        message: error.message,
      };
    }
  }
};

// // google text to speech
// exports.textToSpeech = async (answer) => {
//   const text = `${answer}`;
//   try {
//     const response = await speechClient.synthesizeSpeech({
//       audioConfig: {
//         audioEncoding: 'MP3',
//         effectsProfileId: ['small-bluetooth-speaker-class-device'],
//         pitch: 0,
//         speakingRate: 1,
//       },
//       input: {
//         text: text,
//       },
//       voice: {
//         languageCode: 'cmn-TW',
//         name: 'cmn-TW-Standard-C',
//       },
//     });

//     const audioContent = response[0].audioContent;
//     const audioContentBase64 = audioContent.toString('base64');

//     return audioContentBase64;
//   } catch (error) {
//     console.log('Error in textToSpeech:', error);
//     throw error;
//   }
// };
