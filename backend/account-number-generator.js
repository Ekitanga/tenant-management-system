// Utility to generate unified account numbers

function generatePropertyAbbreviation(propertyName) {
  if (!propertyName) return 'XX';
  
  const cleanName = propertyName
    .replace(/\b(The|A|An)\b/gi, '')
    .trim();
  
  const words = cleanName.split(/\s+/);
  
  if (words.length === 1) {
    return words[0].substring(0, 3).toUpperCase();
  } else {
    return words
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  }
}

function cleanUnitNumber(unitNumber) {
  if (!unitNumber) return 'XX';
  
  // Remove common prefixes and clean up
  let cleaned = String(unitNumber)
    .replace(/\b(Unit|House|Apt|Apartment|Room|Flat)\b/gi, '') // Remove "Unit", "House", etc.
    .trim()
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  
  return cleaned || 'XX';
}

function generateAccountNumber(propertyName, unitNumber) {
  const abbr = generatePropertyAbbreviation(propertyName);
  const cleanUnit = cleanUnitNumber(unitNumber);
  
  return `${abbr}-${cleanUnit}`;
}

module.exports = {
  generatePropertyAbbreviation,
  cleanUnitNumber,
  generateAccountNumber
};