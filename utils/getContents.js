exports.getContents = (subtitles) => {
  try {
    subtitles = subtitles.replace(/\n\n\n/g, '\n\n');

    let subtitlesArray = subtitles.split('\n\n').filter((item) => item.trim() !== '');

    let subtitlesContents = subtitlesArray.map((item) => {
      let parts = item.split('\n');
      let res = parts[0] + '\n' + parts[2] + '\n\n';
      return res;
    });

    return subtitlesContents;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

exports.delMarks = (content) => {
  try {
    if (content.includes('[START]')) {
      content = content.replace(/\[START\]/g, '');
    }
    if (content.includes('[END]')) {
      content = content.replace(/\[END\]/g, '');
    }

    return content;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

exports.checkRes = (result) => {
  try {
    let resultArray = result.split('\n\n').filter((item) => item.trim() !== '');

    // remove all characters include newlines before the first digit
    resultArray = resultArray.map((item) => {
      if (!/^\d/.test(item)) {
        return item.replace(/^\s*[^\d]*(\d.*)$/, '$1');
      } else {
        return item;
      }
    });
    result = resultArray.join('\n\n');

    //modify the end of the string
    if (result.endsWith('\n\n\n')) {
      return result;
    } else if (result.endsWith('\n\n')) {
      return result + '\n';
    } else if (result.endsWith('\n')) {
      return result + '\n\n';
    } else {
      return result + '\n\n\n';
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};
