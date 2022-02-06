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
let _l = JSON.parse(localStorage.getItem('_ladder'));
ladder.handleLadderInit(_l);
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
					<a-button v-if="${!this.ladder.state.connected}"
						:disabled="${!this.socket.state.connected}"
						:loading="${this.ladder.state.connectionRequested}"
						@click="connectLadder"
						> Connect Ladder </a-button>
					<a-button v-if="${!this.chat.state.connected}"
						:disabled="${!this.socket.state.connected}"
						:loading="${this.chat.state.connectionRequested}"
						@click="connectChat"
						> Connect Chat </a-button>
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsb0VBQW9FOzs7Ozs7O0FBRXBFLElBQUksUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7QUFDOUIsUUFBUSxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUVuRCxJQUFJLE1BQU0sR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO0FBQzlCLE1BQU0sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0FBRTNCLElBQUksSUFBSSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7QUFDMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7QUFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7QUFFekIsSUFBSSxNQUFNLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztBQUM5QixNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUN2QixNQUFNLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztBQUczQixJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFFLENBQUMsQ0FBQztBQUN0RCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFBUyxDQUFDLENBQUM7QUFFbkMsTUFBTSxNQUFPLFNBQVEsWUFBWSxDQUFDO0lBQ2pDLElBQUksRUFBRSxRQUFRO0lBQ2QsUUFBUSxFQUFFLFFBQVE7SUFDbEIsTUFBTSxFQUFFLFVBQVU7SUFDbEIsTUFBTSxFQUFFLFVBQVU7Q0FDbEIsQ0FBQztJQUNELGlCQUFpQixHQUFHLEtBQUssQ0FBQztJQUMxQixPQUFPLEdBQVMsRUFBRSxDQUFDO0lBRW5CLElBQUksRUFBRTtRQUNMLE9BQU87Ozt1QkFHYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxD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cHM6Ly9yYXcuZ2l0aGFjay5jb20vRGltYXZhL2ZhaXItY2xpZW50L21hc3Rlci9kaXN0L2luZGV4Lmh0bWxcclxuXHJcbmxldCB1c2VyRGF0YSA9IG5ldyBVc2VyRGF0YSgpO1xyXG51c2VyRGF0YS51dWlkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3V1aWQnKSB8fCAnJztcclxuXHJcbmxldCBzb2NrZXQgPSBuZXcgRmFpclNvY2tldCgpO1xyXG5zb2NrZXQudXNlckRhdGEgPSB1c2VyRGF0YTtcclxuXHJcbmxldCBjaGF0ID0gbmV3IEZhaXJDaGF0KCk7XHJcbmNoYXQuc29ja2V0ID0gc29ja2V0O1xyXG5jaGF0LnVzZXJEYXRhID0gdXNlckRhdGE7XHJcblxyXG5sZXQgbGFkZGVyID0gbmV3IEZhaXJMYWRkZXIoKTtcclxubGFkZGVyLnNvY2tldCA9IHNvY2tldDtcclxubGFkZGVyLnVzZXJEYXRhID0gdXNlckRhdGE7XHJcblxyXG5cclxubGV0IF9sID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnX2xhZGRlcicpISk7XHJcbmxhZGRlci5oYW5kbGVMYWRkZXJJbml0KF9sIGFzIGFueSk7XHJcblxyXG5jbGFzcyBBcHBWdWUgZXh0ZW5kcyBWdWVXaXRoUHJvcHMoe1xyXG5cdGNoYXQ6IEZhaXJDaGF0LFxyXG5cdHVzZXJEYXRhOiBVc2VyRGF0YSxcclxuXHRzb2NrZXQ6IEZhaXJTb2NrZXQsXHJcblx0bGFkZGVyOiBGYWlyTGFkZGVyLFxyXG59KSB7XHJcblx0aW1wb3J0TW9kYWxPcGVuZWQgPSBmYWxzZTtcclxuXHRuZXdVdWlkOiB1dWlkID0gJyc7XHJcblx0QFZ1ZVRlbXBsYXRlXHJcblx0Z2V0IF90KCkge1xyXG5cdFx0cmV0dXJuIGBcclxuXHRcdFx0PEFQUD5cclxuXHRcdFx0XHQ8YS1zcGFjZT5cclxuXHRcdFx0XHRcdDxhLWJ1dHRvbiB2LWlmPVwiJHshdGhpcy5zb2NrZXQuc3RhdGUuY29ubmVjdGVkfVwiIFxyXG5cdFx0XHRcdFx0XHQ6bG9hZGluZz1cIiR7dGhpcy5zb2NrZXQuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZH1cIlxyXG5cdFx0XHRcdFx0XHRAY2xpY2s9XCJjb25uZWN0U29ja2V0XCJcclxuXHRcdFx0XHRcdFx0PiBDb25uZWN0IFNvY2tldCA8L2EtYnV0dG9uPlxyXG5cdFx0XHRcdFx0PGEtYnV0dG9uIHYtaWY9XCIkeyF0aGlzLmxhZGRlci5zdGF0ZS5jb25uZWN0ZWR9XCJcclxuXHRcdFx0XHRcdFx0OmRpc2FibGVkPVwiJHshdGhpcy5zb2NrZXQuc3RhdGUuY29ubmVjdGVkfVwiXHJcblx0XHRcdFx0XHRcdDpsb2FkaW5nPVwiJHt0aGlzLmxhZGRlci5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkfVwiXHJcblx0XHRcdFx0XHRcdEBjbGljaz1cImNvbm5lY3RMYWRkZXJcIlxyXG5cdFx0XHRcdFx0XHQ+IENvbm5lY3QgTGFkZGVyIDwvYS1idXR0b24+XHJcblx0XHRcdFx0XHQ8YS1idXR0b24gdi1pZj1cIiR7IXRoaXMuY2hhdC5zdGF0ZS5jb25uZWN0ZWR9XCJcclxuXHRcdFx0XHRcdFx0OmRpc2FibGVkPVwiJHshdGhpcy5zb2NrZXQuc3RhdGUuY29ubmVjdGVkfVwiXHJcblx0XHRcdFx0XHRcdDpsb2FkaW5nPVwiJHt0aGlzLmNoYXQuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZH1cIlxyXG5cdFx0XHRcdFx0XHRAY2xpY2s9XCJjb25uZWN0Q2hhdFwiXHJcblx0XHRcdFx0XHRcdD4gQ29ubmVjdCBDaGF0IDwvYS1idXR0b24+XHJcblx0XHRcdFx0PC9hLXNwYWNlPlxyXG5cdFx0XHRcdDxhLXJvdz5cclxuXHRcdFx0XHRcdDxhLWNvbCA6c3Bhbj1cIjE0XCI+XHJcblx0XHRcdFx0XHRcdDxGYWlyTGFkZGVyVnVlIHYtaWY9XCIke3RoaXMubGFkZGVyLnN0YXRlLmNvbm5lY3RlZH1cIiA6bGFkZGVyPVwibGFkZGVyXCIgLz5cclxuXHRcdFx0XHRcdDwvYS1jb2w+XHJcblx0XHRcdFx0XHQ8YS1jb2wgOnNwYW49XCIxMFwiPlxyXG5cdFx0XHRcdFx0XHQ8RmFpckNoYXRWdWUgdi1pZj1cIiR7dGhpcy5jaGF0LnN0YXRlLmNvbm5lY3RlZH1cIiA6Y2hhdD1cImNoYXRcIiAvPlxyXG5cdFx0XHRcdFx0PC9hLWNvbD5cclxuXHRcdFx0XHQ8L2Etcm93PlxyXG5cdFx0XHRcdDxhLW1vZGFsXHJcblx0XHRcdFx0XHRcdHYtbW9kZWw6dmlzaWJsZT1cIiR7dGhpcy5pbXBvcnRNb2RhbE9wZW5lZH1cIlxyXG5cdFx0XHRcdFx0XHR0aXRsZT1cIlVVSUQgaW1wb3J0XCJcclxuXHRcdFx0XHRcdFx0QG9rPVwiY29uZmlybVV1aWRJbXBvcnRcIlxyXG5cdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHRUaGlzIGNsaWVudCBkb2VzIG5vdCBzdXBwb3J0IG1ha2luZyBpdHMgb3duIHV1aWRzXHJcblx0XHRcdFx0XHQ8YnI+XHJcblx0XHRcdFx0XHRQbGVhc2UgcGFzdGUgeW91ciBVVUlEXHJcblx0XHRcdFx0XHQ8YS1pbnB1dCByZWY9XCJlbE5ld1V1aWRJbnB1dFwiIHYtbW9kZWw6dmFsdWU9XCJuZXdVdWlkXCIgQHByZXNzRW50ZXI9XCJjb25maXJtVXVpZEltcG9ydFwiIDptYXhsZW5ndGg9XCIzNlwiIC8+XHJcblx0XHRcdFx0PC9hLW1vZGFsPlxyXG5cclxuXHRcdFx0PC9BUFA+XHJcblx0XHRgO1xyXG5cdH1cclxuXHRtb3VudGVkKCkge1xyXG5cdFx0aWYgKCF0aGlzLnVzZXJEYXRhLnV1aWQpIHtcclxuXHRcdFx0dGhpcy5pbXBvcnRNb2RhbE9wZW5lZCA9IHRydWU7XHJcblx0XHR9XHJcblx0fVxyXG5cdGNvbmZpcm1VdWlkSW1wb3J0KCkge1xyXG5cdFx0aWYgKHRoaXMubmV3VXVpZC5tYXRjaCgvLi4uLi4uLi4tLi4uLi0uLi4uLS4uLi4tLi4uLi4uLi4uLi4uLykpIHtcclxuXHRcdFx0dGhpcy51c2VyRGF0YS51dWlkID0gdGhpcy5uZXdVdWlkO1xyXG5cdFx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgndXVpZCcsIHRoaXMubmV3VXVpZCk7XHJcblx0XHRcdHRoaXMuaW1wb3J0TW9kYWxPcGVuZWQgPSBmYWxzZTtcclxuXHRcdFx0bG9jYXRpb24ucmVsb2FkKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmltcG9ydE1vZGFsT3BlbmVkID0gdHJ1ZTtcclxuXHRcdH1cclxuXHR9XHJcblx0Y29ubmVjdFNvY2tldCgpIHtcclxuXHRcdHNvY2tldC5jb25uZWN0KCk7XHJcblx0fVxyXG5cdGNvbm5lY3RDaGF0KCkge1xyXG5cdFx0bGV0IGNoYXQgPSBWdWUudG9SYXcodGhpcy5jaGF0KTtcclxuXHRcdGNoYXQuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IHRydWU7XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0Y2hhdC5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkID0gZmFsc2U7XHJcblx0XHRcdGNoYXQuY29ubmVjdCgpO1xyXG5cdFx0fSwgMTAwMCk7XHJcblx0fVxyXG5cdGNvbm5lY3RMYWRkZXIoKSB7XHJcblx0XHRsZXQgbGFkZGVyID0gVnVlLnRvUmF3KHRoaXMubGFkZGVyKTtcclxuXHRcdGxhZGRlci5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkID0gdHJ1ZTtcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRsYWRkZXIuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IGZhbHNlO1xyXG5cdFx0XHRsYWRkZXIuY29ubmVjdCgpO1xyXG5cdFx0fSwgMTAwMCk7XHJcblx0fVxyXG59XHJcblxyXG5sZXQgYXBwID0gVnVlLmNyZWF0ZUFwcChBcHBWdWUsIHtcclxuXHRzb2NrZXQsXHJcblx0Y2hhdCxcclxuXHRsYWRkZXIsXHJcblx0dXNlckRhdGEsXHJcbn0pLnVzZShWdWVQcm9wRGVjb3JhdG9yQVZhcmlhdGlvbi5jdXN0b20pXHJcblx0LnVzZShWdWVQcm9wRGVjb3JhdG9yQVZhcmlhdGlvbi5rbm93bilcclxuXHQudXNlKGFudGQpO1xyXG5hcHAubW91bnQoJyNhcHAnKTtcclxuIl19