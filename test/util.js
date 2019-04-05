function delay(t = 10) {
  return new Promise(resolve => setTimeout(resolve, t));
}

module.exports = {delay};
