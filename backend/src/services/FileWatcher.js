const chokidar = require('chokidar');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class FileWatcher {
    constructor(watchPath, onChange) {
        this.watchPath = watchPath;
        this.onChange = onChange;
        this.watcher = null;
    }

    async takeOwnership(filepath) {
        try {
            // Get the current process's user and group (node)
            const { stdout: userId } = await execPromise('id -u');
            const { stdout: groupId } = await execPromise('id -g');
            
            // Change ownership of the file
            await execPromise(`sudo chown ${userId.trim()}:${groupId.trim()} "${filepath}"`);
            console.log(`Changed ownership of ${filepath} to node:node`);
            return true;
        } catch (error) {
            console.error(`Error changing file ownership: ${error.message}`);
            return false;
        }
    }

    async start() {
        // Take ownership of existing files
        try {
            const { stdout: files } = await execPromise(`find "${this.watchPath}" -type f -name "*.xml"`);
            const existingFiles = files.trim().split('\n').filter(Boolean);
            
            for (const file of existingFiles) {
                await this.takeOwnership(file);
            }
        } catch (error) {
            console.error(`Error processing existing files: ${error.message}`);
        }

        // Watch for new files
        this.watcher = chokidar.watch(this.watchPath, {
            ignored: /(^|[\/\\])\../,  // ignore dotfiles
            persistent: true,
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 100
            }
        });

        this.watcher
            .on('add', async (path) => {
                console.log(`File ${path} has been added`);
                if (path.endsWith('.xml')) {
                    const ownershipChanged = await this.takeOwnership(path);
                    if (ownershipChanged) {
                        this.onChange(path);
                    }
                }
            })
            .on('error', error => {
                console.error(`Watcher error: ${error}`);
            });

        console.log(`Watching ${this.watchPath} for changes...`);
    }

    stop() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }
}

module.exports = FileWatcher; 