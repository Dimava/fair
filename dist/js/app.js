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

						<LadderTesterVue v-else :ladder="ladder" />
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsb0VBQW9FOzs7Ozs7O0FBRXBFLElBQUksUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7QUFDOUIsUUFBUSxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUVuRCxJQUFJLE1BQU0sR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO0FBQzlCLE1BQU0sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0FBRTNCLElBQUksSUFBSSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7QUFDMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7QUFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7QUFFekIsSUFBSSxNQUFNLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztBQUM5QixNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUN2QixNQUFNLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztBQUczQixJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFFLENBQUMsQ0FBQztBQUN0RCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFBUyxDQUFDLENBQUM7QUFFbkMsTUFBTSxNQUFPLFNBQVEsWUFBWSxDQUFDO0lBQ2pDLElBQUksRUFBRSxRQUFRO0lBQ2QsUUFBUSxFQUFFLFFBQVE7SUFDbEIsTUFBTSxFQUFFLFVBQVU7SUFDbEIsTUFBTSxFQUFFLFVBQVU7Q0FDbEIsQ0FBQztJQUNELGlCQUFpQixHQUFHLEtBQUssQ0FBQztJQUMxQixPQUFPLEdBQVMsRUFBRSxDQUFDO0lBRW5CLElBQUksRUFBRTtRQUNMLE9BQU87Ozt1QkFHYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxD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dHRwczovL3Jhdy5naXRoYWNrLmNvbS9EaW1hdmEvZmFpci1jbGllbnQvbWFzdGVyL2Rpc3QvaW5kZXguaHRtbFxyXG5cclxubGV0IHVzZXJEYXRhID0gbmV3IFVzZXJEYXRhKCk7XHJcbnVzZXJEYXRhLnV1aWQgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgndXVpZCcpIHx8ICcnO1xyXG5cclxubGV0IHNvY2tldCA9IG5ldyBGYWlyU29ja2V0KCk7XHJcbnNvY2tldC51c2VyRGF0YSA9IHVzZXJEYXRhO1xyXG5cclxubGV0IGNoYXQgPSBuZXcgRmFpckNoYXQoKTtcclxuY2hhdC5zb2NrZXQgPSBzb2NrZXQ7XHJcbmNoYXQudXNlckRhdGEgPSB1c2VyRGF0YTtcclxuXHJcbmxldCBsYWRkZXIgPSBuZXcgRmFpckxhZGRlcigpO1xyXG5sYWRkZXIuc29ja2V0ID0gc29ja2V0O1xyXG5sYWRkZXIudXNlckRhdGEgPSB1c2VyRGF0YTtcclxuXHJcblxyXG5sZXQgX2wgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdfbGFkZGVyJykhKTtcclxubGFkZGVyLmhhbmRsZUxhZGRlckluaXQoX2wgYXMgYW55KTtcclxuXHJcbmNsYXNzIEFwcFZ1ZSBleHRlbmRzIFZ1ZVdpdGhQcm9wcyh7XHJcblx0Y2hhdDogRmFpckNoYXQsXHJcblx0dXNlckRhdGE6IFVzZXJEYXRhLFxyXG5cdHNvY2tldDogRmFpclNvY2tldCxcclxuXHRsYWRkZXI6IEZhaXJMYWRkZXIsXHJcbn0pIHtcclxuXHRpbXBvcnRNb2RhbE9wZW5lZCA9IGZhbHNlO1xyXG5cdG5ld1V1aWQ6IHV1aWQgPSAnJztcclxuXHRAVnVlVGVtcGxhdGVcclxuXHRnZXQgX3QoKSB7XHJcblx0XHRyZXR1cm4gYFxyXG5cdFx0XHQ8QVBQPlxyXG5cdFx0XHRcdDxhLXNwYWNlPlxyXG5cdFx0XHRcdFx0PGEtYnV0dG9uIHYtaWY9XCIkeyF0aGlzLnNvY2tldC5zdGF0ZS5jb25uZWN0ZWR9XCIgXHJcblx0XHRcdFx0XHRcdDpsb2FkaW5nPVwiJHt0aGlzLnNvY2tldC5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkfVwiXHJcblx0XHRcdFx0XHRcdEBjbGljaz1cImNvbm5lY3RTb2NrZXRcIlxyXG5cdFx0XHRcdFx0XHQ+IENvbm5lY3QgU29ja2V0IDwvYS1idXR0b24+XHJcblx0XHRcdFx0XHQ8YS1idXR0b24gdi1pZj1cIiR7IXRoaXMubGFkZGVyLnN0YXRlLmNvbm5lY3RlZH1cIlxyXG5cdFx0XHRcdFx0XHQ6ZGlzYWJsZWQ9XCIkeyF0aGlzLnNvY2tldC5zdGF0ZS5jb25uZWN0ZWR9XCJcclxuXHRcdFx0XHRcdFx0OmxvYWRpbmc9XCIke3RoaXMubGFkZGVyLnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWR9XCJcclxuXHRcdFx0XHRcdFx0QGNsaWNrPVwiY29ubmVjdExhZGRlclwiXHJcblx0XHRcdFx0XHRcdD4gQ29ubmVjdCBMYWRkZXIgPC9hLWJ1dHRvbj5cclxuXHRcdFx0XHRcdDxhLWJ1dHRvbiB2LWlmPVwiJHshdGhpcy5jaGF0LnN0YXRlLmNvbm5lY3RlZH1cIlxyXG5cdFx0XHRcdFx0XHQ6ZGlzYWJsZWQ9XCIkeyF0aGlzLnNvY2tldC5zdGF0ZS5jb25uZWN0ZWR9XCJcclxuXHRcdFx0XHRcdFx0OmxvYWRpbmc9XCIke3RoaXMuY2hhdC5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkfVwiXHJcblx0XHRcdFx0XHRcdEBjbGljaz1cImNvbm5lY3RDaGF0XCJcclxuXHRcdFx0XHRcdFx0PiBDb25uZWN0IENoYXQgPC9hLWJ1dHRvbj5cclxuXHRcdFx0XHQ8L2Etc3BhY2U+XHJcblx0XHRcdFx0PGEtcm93PlxyXG5cdFx0XHRcdFx0PGEtY29sIDpzcGFuPVwiMTRcIj5cclxuXHRcdFx0XHRcdFx0PEZhaXJMYWRkZXJWdWUgdi1pZj1cIiR7dGhpcy5sYWRkZXIuc3RhdGUuY29ubmVjdGVkfVwiIDpsYWRkZXI9XCJsYWRkZXJcIiAvPlxyXG5cdFx0XHRcdFx0PC9hLWNvbD5cclxuXHRcdFx0XHRcdDxhLWNvbCA6c3Bhbj1cIjEwXCI+XHJcblx0XHRcdFx0XHRcdDxGYWlyQ2hhdFZ1ZSB2LWlmPVwiJHt0aGlzLmNoYXQuc3RhdGUuY29ubmVjdGVkfVwiIDpjaGF0PVwiY2hhdFwiIC8+XHJcblxyXG5cdFx0XHRcdFx0XHQ8TGFkZGVyVGVzdGVyVnVlIHYtZWxzZSA6bGFkZGVyPVwibGFkZGVyXCIgLz5cclxuXHRcdFx0XHRcdDwvYS1jb2w+XHJcblx0XHRcdFx0PC9hLXJvdz5cclxuXHRcdFx0XHQ8YS1tb2RhbFxyXG5cdFx0XHRcdFx0XHR2LW1vZGVsOnZpc2libGU9XCIke3RoaXMuaW1wb3J0TW9kYWxPcGVuZWR9XCJcclxuXHRcdFx0XHRcdFx0dGl0bGU9XCJVVUlEIGltcG9ydFwiXHJcblx0XHRcdFx0XHRcdEBvaz1cImNvbmZpcm1VdWlkSW1wb3J0XCJcclxuXHRcdFx0XHRcdFx0PlxyXG5cdFx0XHRcdFx0VGhpcyBjbGllbnQgZG9lcyBub3Qgc3VwcG9ydCBtYWtpbmcgaXRzIG93biB1dWlkc1xyXG5cdFx0XHRcdFx0PGJyPlxyXG5cdFx0XHRcdFx0UGxlYXNlIHBhc3RlIHlvdXIgVVVJRFxyXG5cdFx0XHRcdFx0PGEtaW5wdXQgcmVmPVwiZWxOZXdVdWlkSW5wdXRcIiB2LW1vZGVsOnZhbHVlPVwibmV3VXVpZFwiIEBwcmVzc0VudGVyPVwiY29uZmlybVV1aWRJbXBvcnRcIiA6bWF4bGVuZ3RoPVwiMzZcIiAvPlxyXG5cdFx0XHRcdDwvYS1tb2RhbD5cclxuXHJcblx0XHRcdDwvQVBQPlxyXG5cdFx0YDtcclxuXHR9XHJcblx0bW91bnRlZCgpIHtcclxuXHRcdGlmICghdGhpcy51c2VyRGF0YS51dWlkKSB7XHJcblx0XHRcdHRoaXMuaW1wb3J0TW9kYWxPcGVuZWQgPSB0cnVlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRjb25maXJtVXVpZEltcG9ydCgpIHtcclxuXHRcdGlmICh0aGlzLm5ld1V1aWQubWF0Y2goLy4uLi4uLi4uLS4uLi4tLi4uLi0uLi4uLS4uLi4uLi4uLi4uLi8pKSB7XHJcblx0XHRcdHRoaXMudXNlckRhdGEudXVpZCA9IHRoaXMubmV3VXVpZDtcclxuXHRcdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3V1aWQnLCB0aGlzLm5ld1V1aWQpO1xyXG5cdFx0XHR0aGlzLmltcG9ydE1vZGFsT3BlbmVkID0gZmFsc2U7XHJcblx0XHRcdGxvY2F0aW9uLnJlbG9hZCgpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5pbXBvcnRNb2RhbE9wZW5lZCA9IHRydWU7XHJcblx0XHR9XHJcblx0fVxyXG5cdGNvbm5lY3RTb2NrZXQoKSB7XHJcblx0XHRzb2NrZXQuY29ubmVjdCgpO1xyXG5cdH1cclxuXHRjb25uZWN0Q2hhdCgpIHtcclxuXHRcdGxldCBjaGF0ID0gVnVlLnRvUmF3KHRoaXMuY2hhdCk7XHJcblx0XHRjaGF0LnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWQgPSB0cnVlO1xyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdGNoYXQuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IGZhbHNlO1xyXG5cdFx0XHRjaGF0LmNvbm5lY3QoKTtcclxuXHRcdH0sIDEwMDApO1xyXG5cdH1cclxuXHRjb25uZWN0TGFkZGVyKCkge1xyXG5cdFx0bGV0IGxhZGRlciA9IFZ1ZS50b1Jhdyh0aGlzLmxhZGRlcik7XHJcblx0XHRsYWRkZXIuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IHRydWU7XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0bGFkZGVyLnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWQgPSBmYWxzZTtcclxuXHRcdFx0bGFkZGVyLmNvbm5lY3QoKTtcclxuXHRcdH0sIDEwMDApO1xyXG5cdH1cclxufVxyXG5cclxubGV0IGFwcCA9IFZ1ZS5jcmVhdGVBcHAoQXBwVnVlLCB7XHJcblx0c29ja2V0LFxyXG5cdGNoYXQsXHJcblx0bGFkZGVyLFxyXG5cdHVzZXJEYXRhLFxyXG59KS51c2UoVnVlUHJvcERlY29yYXRvckFWYXJpYXRpb24uY3VzdG9tKVxyXG5cdC51c2UoVnVlUHJvcERlY29yYXRvckFWYXJpYXRpb24ua25vd24pXHJcblx0LnVzZShhbnRkKTtcclxuYXBwLm1vdW50KCcjYXBwJyk7XHJcbiJdfQ==