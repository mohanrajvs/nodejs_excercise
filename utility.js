const moment = require("moment");
exports.formatDate = (date) => {
  if (!date) {
    return null; // Handle null or undefined dates
  }
  return moment(date).format("YYYY-MM-DD");
};
