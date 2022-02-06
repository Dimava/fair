"use strict";
// https://raw.githack.com/Dimava/fair-client/master/dist/index.html
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let userData = new UserData();
userData.uuid = localStorage.getItem('uuid') || '';
let socket = new FairSocket();
socket.userData = userData;
let chat = new FairChat();
chat.socket = socket;
chat.userData = userData;
let ladder = new FairLadder();
ladder.socket = socket;
ladder.userData = userData;
// let _l = JSON.parse(localStorage.getItem('_ladder')!);
// ladder.handleLadderInit(_l as any);
class AppVue extends VueWithProps({
    chat: FairChat,
    userData: UserData,
    socket: FairSocket,
    ladder: FairLadder,
}) {
    importModalOpened = false;
    newUuid = '';
    get _t() {
        return `
			<APP>
				<a-space>
					<a-button v-if="${!this.socket.state.connected}" 
						:loading="${this.socket.state.connectionRequested}"
						@click="connectSocket"
						> Connect Socket </a-button>
					<a-button v-if="${!this.chat.state.connected}"
						:disabled="${!this.socket.state.connected}"
						:loading="${this.chat.state.connectionRequested}"
						@click="connectChat"
						> Connect Chat </a-button>
					<a-button v-if="${!this.ladder.state.connected}"
						:disabled="${!this.socket.state.connected}"
						:loading="${this.ladder.state.connectionRequested}"
						@click="connectLadder"
						> Connect Ladder </a-button>
				</a-space>
				<a-row>
					<a-col :span="14">
						<FairLadderVue v-if="${this.ladder.state.connected}" :ladder="ladder" />
					</a-col>
					<a-col :span="10">
						<FairChatVue v-if="${this.chat.state.connected}" :chat="chat" />
					</a-col>
				</a-row>
				<a-modal
						v-model:visible="${this.importModalOpened}"
						title="UUID import"
						@ok="confirmUuidImport"
						>
					This client does not support making its own uuids
					<br>
					Please paste your UUID
					<a-input ref="elNewUuidInput" v-model:value="newUuid" @pressEnter="confirmUuidImport" :maxlength="36" />
				</a-modal>

			</APP>
		`;
    }
    mounted() {
        if (!this.userData.uuid) {
            this.importModalOpened = true;
        }
    }
    confirmUuidImport() {
        if (this.newUuid.match(/........-....-....-....-............/)) {
            this.userData.uuid = this.newUuid;
            localStorage.setItem('uuid', this.newUuid);
            this.importModalOpened = false;
            location.reload();
        }
        else {
            this.importModalOpened = true;
        }
    }
    connectSocket() {
        socket.connect();
    }
    connectChat() {
        let chat = Vue.toRaw(this.chat);
        chat.state.connectionRequested = true;
        setTimeout(() => {
            chat.state.connectionRequested = false;
            chat.connect();
        }, 1000);
    }
    connectLadder() {
        let ladder = Vue.toRaw(this.ladder);
        ladder.state.connectionRequested = true;
        setTimeout(() => {
            ladder.state.connectionRequested = false;
            ladder.connect();
        }, 1000);
    }
}
__decorate([
    VueTemplate
], AppVue.prototype, "_t", null);
let app = Vue.createApp(AppVue, {
    socket,
    chat,
    ladder,
    userData,
}).use(VuePropDecoratorAVariation.custom)
    .use(VuePropDecoratorAVariation.known)
    .use(antd);
app.mount('#app');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsb0VBQW9FOzs7Ozs7O0FBRXBFLElBQUksUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7QUFDOUIsUUFBUSxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUVuRCxJQUFJLE1BQU0sR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO0FBQzlCLE1BQU0sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0FBRTNCLElBQUksSUFBSSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7QUFDMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7QUFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7QUFFekIsSUFBSSxNQUFNLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztBQUM5QixNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUN2QixNQUFNLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztBQUczQix5REFBeUQ7QUFDekQsc0NBQXNDO0FBRXRDLE1BQU0sTUFBTyxTQUFRLFlBQVksQ0FBQztJQUNqQyxJQUFJLEVBQUUsUUFBUTtJQUNkLFFBQVEsRUFBRSxRQUFRO0lBQ2xCLE1BQU0sRUFBRSxVQUFVO0lBQ2xCLE1BQU0sRUFBRSxVQUFVO0NBQ2xCLENBQUM7SUFDRCxpQkFBaUIsR0FBRyxLQUFLLENBQUM7SUFDMUIsT0FBTyxHQUFTLEVBQUUsQ0FBQztJQUVuQixJQUFJLEVBQUU7UUFDTCxPQUFPOzs7dUJBR2MsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTO2tCQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxtQkFBbUI7Ozt1QkFHaEMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTO21CQUM5QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVM7a0JBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQjs7O3VCQUc5QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVM7bUJBQ2hDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUztrQkFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsbUJBQW1COzs7Ozs7NkJBTTFCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVM7OzsyQkFHN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUzs7Ozt5QkFJM0IsSUFBSSxDQUFDLGlCQUFpQjs7Ozs7Ozs7Ozs7R0FXNUMsQ0FBQztJQUNILENBQUM7SUFDRCxPQUFPO1FBQ04sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFO1lBQ3hCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7U0FDOUI7SUFDRixDQUFDO0lBQ0QsaUJBQWlCO1FBQ2hCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0NBQXNDLENBQUMsRUFBRTtZQUMvRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ2xDLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMzQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFDO1lBQy9CLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztTQUNsQjthQUFNO1lBQ04sSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztTQUM5QjtJQUNGLENBQUM7SUFDRCxhQUFhO1FBQ1osTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFDRCxXQUFXO1FBQ1YsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUM7UUFDdEMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEdBQUcsS0FBSyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNoQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDVixDQUFDO0lBQ0QsYUFBYTtRQUNaLElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO1FBQ3hDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZixNQUFNLENBQUMsS0FBSyxDQUFDLG1CQUFtQixHQUFHLEtBQUssQ0FBQztZQUN6QyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ1YsQ0FBQztDQUNEO0FBM0VBO0lBREMsV0FBVztnQ0F5Q1g7QUFxQ0YsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUU7SUFDL0IsTUFBTTtJQUNOLElBQUk7SUFDSixNQUFNO0lBQ04sUUFBUTtDQUNSLENBQUMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsTUFBTSxDQUFDO0tBQ3ZDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUM7S0FDckMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ1osR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGh0dHBzOi8vcmF3LmdpdGhhY2suY29tL0RpbWF2YS9mYWlyLWNsaWVudC9tYXN0ZXIvZGlzdC9pbmRleC5odG1sXHJcblxyXG5sZXQgdXNlckRhdGEgPSBuZXcgVXNlckRhdGEoKTtcclxudXNlckRhdGEudXVpZCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd1dWlkJykgfHwgJyc7XHJcblxyXG5sZXQgc29ja2V0ID0gbmV3IEZhaXJTb2NrZXQoKTtcclxuc29ja2V0LnVzZXJEYXRhID0gdXNlckRhdGE7XHJcblxyXG5sZXQgY2hhdCA9IG5ldyBGYWlyQ2hhdCgpO1xyXG5jaGF0LnNvY2tldCA9IHNvY2tldDtcclxuY2hhdC51c2VyRGF0YSA9IHVzZXJEYXRhO1xyXG5cclxubGV0IGxhZGRlciA9IG5ldyBGYWlyTGFkZGVyKCk7XHJcbmxhZGRlci5zb2NrZXQgPSBzb2NrZXQ7XHJcbmxhZGRlci51c2VyRGF0YSA9IHVzZXJEYXRhO1xyXG5cclxuXHJcbi8vIGxldCBfbCA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oJ19sYWRkZXInKSEpO1xyXG4vLyBsYWRkZXIuaGFuZGxlTGFkZGVySW5pdChfbCBhcyBhbnkpO1xyXG5cclxuY2xhc3MgQXBwVnVlIGV4dGVuZHMgVnVlV2l0aFByb3BzKHtcclxuXHRjaGF0OiBGYWlyQ2hhdCxcclxuXHR1c2VyRGF0YTogVXNlckRhdGEsXHJcblx0c29ja2V0OiBGYWlyU29ja2V0LFxyXG5cdGxhZGRlcjogRmFpckxhZGRlcixcclxufSkge1xyXG5cdGltcG9ydE1vZGFsT3BlbmVkID0gZmFsc2U7XHJcblx0bmV3VXVpZDogdXVpZCA9ICcnO1xyXG5cdEBWdWVUZW1wbGF0ZVxyXG5cdGdldCBfdCgpIHtcclxuXHRcdHJldHVybiBgXHJcblx0XHRcdDxBUFA+XHJcblx0XHRcdFx0PGEtc3BhY2U+XHJcblx0XHRcdFx0XHQ8YS1idXR0b24gdi1pZj1cIiR7IXRoaXMuc29ja2V0LnN0YXRlLmNvbm5lY3RlZH1cIiBcclxuXHRcdFx0XHRcdFx0OmxvYWRpbmc9XCIke3RoaXMuc29ja2V0LnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWR9XCJcclxuXHRcdFx0XHRcdFx0QGNsaWNrPVwiY29ubmVjdFNvY2tldFwiXHJcblx0XHRcdFx0XHRcdD4gQ29ubmVjdCBTb2NrZXQgPC9hLWJ1dHRvbj5cclxuXHRcdFx0XHRcdDxhLWJ1dHRvbiB2LWlmPVwiJHshdGhpcy5jaGF0LnN0YXRlLmNvbm5lY3RlZH1cIlxyXG5cdFx0XHRcdFx0XHQ6ZGlzYWJsZWQ9XCIkeyF0aGlzLnNvY2tldC5zdGF0ZS5jb25uZWN0ZWR9XCJcclxuXHRcdFx0XHRcdFx0OmxvYWRpbmc9XCIke3RoaXMuY2hhdC5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkfVwiXHJcblx0XHRcdFx0XHRcdEBjbGljaz1cImNvbm5lY3RDaGF0XCJcclxuXHRcdFx0XHRcdFx0PiBDb25uZWN0IENoYXQgPC9hLWJ1dHRvbj5cclxuXHRcdFx0XHRcdDxhLWJ1dHRvbiB2LWlmPVwiJHshdGhpcy5sYWRkZXIuc3RhdGUuY29ubmVjdGVkfVwiXHJcblx0XHRcdFx0XHRcdDpkaXNhYmxlZD1cIiR7IXRoaXMuc29ja2V0LnN0YXRlLmNvbm5lY3RlZH1cIlxyXG5cdFx0XHRcdFx0XHQ6bG9hZGluZz1cIiR7dGhpcy5sYWRkZXIuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZH1cIlxyXG5cdFx0XHRcdFx0XHRAY2xpY2s9XCJjb25uZWN0TGFkZGVyXCJcclxuXHRcdFx0XHRcdFx0PiBDb25uZWN0IExhZGRlciA8L2EtYnV0dG9uPlxyXG5cdFx0XHRcdDwvYS1zcGFjZT5cclxuXHRcdFx0XHQ8YS1yb3c+XHJcblx0XHRcdFx0XHQ8YS1jb2wgOnNwYW49XCIxNFwiPlxyXG5cdFx0XHRcdFx0XHQ8RmFpckxhZGRlclZ1ZSB2LWlmPVwiJHt0aGlzLmxhZGRlci5zdGF0ZS5jb25uZWN0ZWR9XCIgOmxhZGRlcj1cImxhZGRlclwiIC8+XHJcblx0XHRcdFx0XHQ8L2EtY29sPlxyXG5cdFx0XHRcdFx0PGEtY29sIDpzcGFuPVwiMTBcIj5cclxuXHRcdFx0XHRcdFx0PEZhaXJDaGF0VnVlIHYtaWY9XCIke3RoaXMuY2hhdC5zdGF0ZS5jb25uZWN0ZWR9XCIgOmNoYXQ9XCJjaGF0XCIgLz5cclxuXHRcdFx0XHRcdDwvYS1jb2w+XHJcblx0XHRcdFx0PC9hLXJvdz5cclxuXHRcdFx0XHQ8YS1tb2RhbFxyXG5cdFx0XHRcdFx0XHR2LW1vZGVsOnZpc2libGU9XCIke3RoaXMuaW1wb3J0TW9kYWxPcGVuZWR9XCJcclxuXHRcdFx0XHRcdFx0dGl0bGU9XCJVVUlEIGltcG9ydFwiXHJcblx0XHRcdFx0XHRcdEBvaz1cImNvbmZpcm1VdWlkSW1wb3J0XCJcclxuXHRcdFx0XHRcdFx0PlxyXG5cdFx0XHRcdFx0VGhpcyBjbGllbnQgZG9lcyBub3Qgc3VwcG9ydCBtYWtpbmcgaXRzIG93biB1dWlkc1xyXG5cdFx0XHRcdFx0PGJyPlxyXG5cdFx0XHRcdFx0UGxlYXNlIHBhc3RlIHlvdXIgVVVJRFxyXG5cdFx0XHRcdFx0PGEtaW5wdXQgcmVmPVwiZWxOZXdVdWlkSW5wdXRcIiB2LW1vZGVsOnZhbHVlPVwibmV3VXVpZFwiIEBwcmVzc0VudGVyPVwiY29uZmlybVV1aWRJbXBvcnRcIiA6bWF4bGVuZ3RoPVwiMzZcIiAvPlxyXG5cdFx0XHRcdDwvYS1tb2RhbD5cclxuXHJcblx0XHRcdDwvQVBQPlxyXG5cdFx0YDtcclxuXHR9XHJcblx0bW91bnRlZCgpIHtcclxuXHRcdGlmICghdGhpcy51c2VyRGF0YS51dWlkKSB7XHJcblx0XHRcdHRoaXMuaW1wb3J0TW9kYWxPcGVuZWQgPSB0cnVlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRjb25maXJtVXVpZEltcG9ydCgpIHtcclxuXHRcdGlmICh0aGlzLm5ld1V1aWQubWF0Y2goLy4uLi4uLi4uLS4uLi4tLi4uLi0uLi4uLS4uLi4uLi4uLi4uLi8pKSB7XHJcblx0XHRcdHRoaXMudXNlckRhdGEudXVpZCA9IHRoaXMubmV3VXVpZDtcclxuXHRcdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3V1aWQnLCB0aGlzLm5ld1V1aWQpO1xyXG5cdFx0XHR0aGlzLmltcG9ydE1vZGFsT3BlbmVkID0gZmFsc2U7XHJcblx0XHRcdGxvY2F0aW9uLnJlbG9hZCgpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5pbXBvcnRNb2RhbE9wZW5lZCA9IHRydWU7XHJcblx0XHR9XHJcblx0fVxyXG5cdGNvbm5lY3RTb2NrZXQoKSB7XHJcblx0XHRzb2NrZXQuY29ubmVjdCgpO1xyXG5cdH1cclxuXHRjb25uZWN0Q2hhdCgpIHtcclxuXHRcdGxldCBjaGF0ID0gVnVlLnRvUmF3KHRoaXMuY2hhdCk7XHJcblx0XHRjaGF0LnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWQgPSB0cnVlO1xyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdGNoYXQuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IGZhbHNlO1xyXG5cdFx0XHRjaGF0LmNvbm5lY3QoKTtcclxuXHRcdH0sIDEwMDApO1xyXG5cdH1cclxuXHRjb25uZWN0TGFkZGVyKCkge1xyXG5cdFx0bGV0IGxhZGRlciA9IFZ1ZS50b1Jhdyh0aGlzLmxhZGRlcik7XHJcblx0XHRsYWRkZXIuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IHRydWU7XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0bGFkZGVyLnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWQgPSBmYWxzZTtcclxuXHRcdFx0bGFkZGVyLmNvbm5lY3QoKTtcclxuXHRcdH0sIDEwMDApO1xyXG5cdH1cclxufVxyXG5cclxubGV0IGFwcCA9IFZ1ZS5jcmVhdGVBcHAoQXBwVnVlLCB7XHJcblx0c29ja2V0LFxyXG5cdGNoYXQsXHJcblx0bGFkZGVyLFxyXG5cdHVzZXJEYXRhLFxyXG59KS51c2UoVnVlUHJvcERlY29yYXRvckFWYXJpYXRpb24uY3VzdG9tKVxyXG5cdC51c2UoVnVlUHJvcERlY29yYXRvckFWYXJpYXRpb24ua25vd24pXHJcblx0LnVzZShhbnRkKTtcclxuYXBwLm1vdW50KCcjYXBwJyk7XHJcbiJdfQ==