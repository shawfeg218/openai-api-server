// file: services/videoService.js
const fetch = require('node-fetch');
const FormData = require('form-data');
const ytdl = require('ytdl-core');
const { OpenAIApi, Configuration } = require('openai');
const { getContents, delMarks, checkRes } = require('../utils/getContents');

const openaiKey = process.env.OPENAI_API_KEY;

exports.transcribeVideo = async (videoUrl) => {
  try {
    if (!ytdl.validateURL(videoUrl)) {
      throw new Error('Invalid video URL');
    }
    // download audio from youtube
    const stream = ytdl(videoUrl, { quality: 'lowestaudio', format: 'mp4' });

    // Check audio size
    let audioSizeMB = 0;
    stream.on('data', (chunk) => {
      audioSizeMB += chunk.length / (1024 * 1024);
      if (audioSizeMB > 24.5) {
        stream.destroy(new Error('Audio size exceeds 25MB limit'));
      }
    });

    const formData = new FormData();
    formData.append('file', stream, 'audio.mp4');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'srt');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const { error } = await response.json();
      throw {
        name: 'Whisper APIError',
        message: error?.message || 'Unknown error',
      };
    }

    const responseText = await response.text();
    return responseText;
  } catch (error) {
    console.log('Error in transcribeVideo:', error);
    throw error;
  }
};

exports.translateTranscription = async (transcription) => {
  try {
    const prompt = "您是一位專門從事字幕翻譯的高級翻譯員。您的任務是將[START]和[END]標記之間的字幕內容翻譯成繁體中文。每個字幕都由其自己的數字標記並且由換行符分隔，應單獨翻譯。請不要合併或合並字幕。例如，'1\nHello!\n\n2\nHow can I help you?\n\n'應該翻譯為'1\n你好!\n\n2\n我能如何幫你?\n\n'。它不應該被翻譯為'1\n你好!我能如何幫你?\n\n'。請保留所有字幕的數字和所有換行符號，保持文本的原始格式。特別注意，即使原文中的某些句子在語義上相關聯，也請保持它們的獨立性，不要將它們合併成一個句子。"
    // const sentencesFor16k = 250;
    const sentencesOneTime = 50;
    let result = '';

    const configuration = new Configuration({ apiKey: openaiKey });
    const openai = new OpenAIApi(configuration);

    // if (transcription.length > 1850) {
    if (transcription.length > 3850) {
      const transcriptionArray = getContents(transcription);
      const contentArray = [];
      let item = '';
      let index = 0;

      for (let i = 0; i < transcriptionArray.length; i++) {
        item += transcriptionArray[i];
        index++;

        // if (index === sentencesFor16k) {
        if (index === sentencesOneTime) {
          contentArray.push(item);
          item = '';
          index = 0;
        }
      }

      if (item !== '') {
        contentArray.push(item);
      }

      for (let item of contentArray) {
        const response = await openai.createChatCompletion({
          // model: 'gpt-3.5-turbo-16k',
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: prompt,
            },
            {
              role: 'user',
              content: `[START]${item}[END]`,
            },
          ],
        });
        const { data } = response;
        // console.log('Data: ', data);
        // console.log(data.choices[0].message);

        // console.log('gpt-3.5-turbo-16k', data.usage);
        console.log('gpt-4 separated: ', data.usage);

        let contentDM = delMarks(data.choices[0].message.content);

        if (!contentDM.endsWith('\n\n')) {
          contentDM += '\n\n';
        }

        result += contentDM;
      }
    } else {
      const transcriptionArray = getContents(transcription);
      let item = '';

      for (let i = 0; i < transcriptionArray.length; i++) {
        item += transcriptionArray[i];
      }

      const response = await openai.createChatCompletion({
        // model: 'gpt-3.5-turbo',
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: `[START]${item}[END]`,
          },
        ],
      });

      const { data } = response;
      // console.log('Data: ', data);
      // console.log(data.choices[0].message);

      // console.log('gpt-3.5-turbo: ', data.usage);
      console.log('gpt-4 one time: ', data.usage);

      const contentDM = delMarks(data.choices[0].message.content);
      result += contentDM;
    }

    return checkRes(result);
  } catch (error) {
    if (error.response) {
      throw {
        name: 'APIError',
        message: error.response.data.error.message,
      };
    } else {
      throw {
        name: 'UnknownError',
        message: error.message,
      };
    }
  }
};

exports.contentChat = async (content) => {
  try {
    const prompt =
      '你是一個幫助學習語言的教師。當給你任何語言的內容時，你將會在內容中找出常用的詞語或句型，然後以繁體中文生成教學內容。';

    const configuration = new Configuration({ apiKey: openaiKey });
    const openai = new OpenAIApi(configuration);

    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `請你從以下內容中找出10個該語言常用詞語: "${content}"`,
        },
      ],
    });

    const { data } = response;
    // console.log('Data: ', data);
    // console.log(data.choices[0].message);
    console.log('gpt-4: ', data.usage);
    return data.choices[0].message.content;
  } catch (error) {
    if (error.response) {
      throw {
        name: 'APIError',
        message: error.response.data.error.message,
      };
    } else {
      throw {
        name: 'UnknownError',
        message: error.message,
      };
    }
  }
};
