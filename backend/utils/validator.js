const fs = require('fs').promises;
const path = require('path');

// Validate directory path
const isValidDirectory = async (directory) => {
  try {
    // Normalize the path to prevent directory traversal attacks
    const normalizedPath = path.normalize(directory);
    const stats = await fs.stat(normalizedPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
};

module.exports = {
  isValidDirectory
};
