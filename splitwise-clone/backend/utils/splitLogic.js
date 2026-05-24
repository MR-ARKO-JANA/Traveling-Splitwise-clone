/**
 * Calculates how much each person owes based on the split type.
 * @param {number} totalAmount
 * @param {Array} splitWith - Array of user IDs involved in the split
 * @param {string} splitType - "equal", "exact", "percentage", "shares"
 * @param {Array} splitDetails - Array of { user, amount, percentage, shares }
 * @returns {Object} Map of user ID to amount owed
 */
function calculateShares(totalAmount, splitWith, splitType, splitDetails = []) {
  const sharesMap = {};

  if (splitType === 'equal' || !splitType) {
    const amountPerPerson = Number((totalAmount / splitWith.length).toFixed(2));
    let sum = 0;
    splitWith.forEach((userId, index) => {
      const uId = userId.toString();
      if (index === splitWith.length - 1) {
        sharesMap[uId] = Number((totalAmount - sum).toFixed(2));
      } else {
        sharesMap[uId] = amountPerPerson;
        sum += amountPerPerson;
      }
    });
    return sharesMap;
  }

  if (splitType === 'exact') {
    splitDetails.forEach((detail) => {
      sharesMap[detail.user.toString()] = Number(detail.amount);
    });
    return sharesMap;
  }

  if (splitType === 'percentage') {
    splitDetails.forEach((detail) => {
      sharesMap[detail.user.toString()] = Number(
        ((totalAmount * detail.percentage) / 100).toFixed(2)
      );
    });
    return sharesMap;
  }

  if (splitType === 'shares') {
    const totalShares = splitDetails.reduce((sum, detail) => sum + Number(detail.shares || 0), 0);
    let sum = 0;
    splitDetails.forEach((detail, index) => {
      const uId = detail.user.toString();
      if (index === splitDetails.length - 1) {
        sharesMap[uId] = Number((totalAmount - sum).toFixed(2));
      } else {
        const amount = Number(((totalAmount * detail.shares) / totalShares).toFixed(2));
        sharesMap[uId] = amount;
        sum += amount;
      }
    });
    return sharesMap;
  }

  return sharesMap;
}

module.exports = { calculateShares };
