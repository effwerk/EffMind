/**
 * @class NodeHistory
 * @description 为思维导图状态实现撤销/重做历史记录。
 */
export default class NodeHistory {
    constructor() {
        /**
         * @property {Array<object>} history - 用于存储思维导图状态历史记录的数组。
         */
        this.history = [];
        /**
         * @property {number} currentIndex - 历史记录数组中当前状态的索引。
         */
        this.currentIndex = -1;
    }

    /**
     * @method addState
     * @description 将新状态添加到历史记录中。如果当前索引不在历史记录的末尾，
     * 它会在添加新状态之前截断当前索引之后的历史记录。
     * 它还可以防止添加重复的连续状态。
     * @param {object} state - 要添加到历史记录的思维导图状态。
     */
    addState(state) {
        const serializedState = JSON.stringify(state);
        // 如果新状态与当前状态相同，则不添加。
        if (this.currentIndex > -1 && serializedState === JSON.stringify(this.history[this.currentIndex])) {
            return;
        }

        // 如果我们已经撤销了一些操作，我们在添加新状态之前截断未来的历史记录。
        this.history = this.history.slice(0, this.currentIndex + 1);
        this.history.push(JSON.parse(serializedState));
        this.currentIndex++;
    }

    /**
     * @method undo
     * @description 将当前状态在历史记录中后退一步，并返回上一个状态。
     * @returns {object|null} 上一个状态，如果没有可撤销的状态，则为 null。
     */
    undo() {
        if (this.canUndo()) {
            this.currentIndex--;
            return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
        }
        return null;
    }

    /**
     * @method redo
     * @description 将当前状态在历史记录中前进一步，并返回下一个状态。
     * @returns {object|null} 下一个状态，如果没有可重做的状态，则为 null。
     */
    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
        }
        return null;
    }

    /**
     * @method canUndo
     * @description 检查是否有可撤销的状态。
     * @returns {boolean} 如果可以撤销则为 true，否则为 false。
     */
    canUndo() {
        return this.currentIndex > 0;
    }

    /**
     * @method canRedo
     * @description 检查是否有可重做的状态。
     * @returns {boolean} 如果可以重做则为 true，否则为 false。
     */
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    /**
     * @method clear
     * @description 清除整个历史记录。
     */
    clear() {
        this.history = [];
        this.currentIndex = -1;
    }
}