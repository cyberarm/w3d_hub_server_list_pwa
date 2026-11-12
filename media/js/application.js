class ServerList {
  constructor() {
    this.servers = [];

    this.host_element = document.querySelector("#host");

    this.websocket = new WebSocket("wss://gsh.w3d.cyberarm.dev/api/websocket");
    this.websocket.addEventListener("open", (event) => {
      console.log(event);

      // Send handshake
      this.websocket.send("{ \"protocol_version\": 1 }");
    });

    this.websocket.addEventListener("message", (event) => {
      // console.log(event);

      this.handle_websocket(event);
    });

    console.log("Hello World");
  }

  handle_websocket(event) {
    let data = JSON.parse(event.data);

    switch (data.type) {
      case "server_list": {
        console.log("SERVER LIST!")

        this.host_element.innerHTML = "";
        data.data.sort((a, b) => { return a.status.numplayers < b.status.numplayers }).forEach((hash) => {
          this.add_server_item(hash);
        });
        break;
      }

      case "server_updated": {
        console.log("SERVER UPDATED!")

        this.update_server_item(data.data);
        break;
      }

      default: {
        console.log(data.type);

        break;
      }
    }
  }

  add_server_item(hash) {
    let card = document.createElement("div");
    card.classList.add("card", "server-row", "row");
    card.dataset["uuid"] = hash.id;

    let app_icon = document.createElement("img");
    app_icon.classList.add("icon");
    app_icon.srcset = `/media/images/${hash.game}/icon.webp`;
    app_icon.dataset["icon"] = hash.game;

    let server_info = document.createElement("div");
    server_info.classList.add("grow");
    let server_info_label = document.createElement("strong");
    server_info_label.dataset["name"] = hash.status.name;
    server_info_label.innerText = hash.status.name;
    let server_info_value = document.createElement("p");
    server_info_value.dataset["map"] = hash.status.map;
    server_info_value.innerText = hash.status.map;
    server_info.appendChild(server_info_label);
    server_info.appendChild(server_info_value);

    let player_info = document.createElement("div");
    let player_info_label = document.createElement("strong");
    player_info_label.innerText = "Players";
    let player_info_value = document.createElement("p");
    player_info_value.dataset["players"] = `${hash.status.numplayers}`;
    player_info_value.dataset["max_players"] = `${hash.status.maxplayers}`;
    player_info_value.innerText = `${hash.status.numplayers}/${hash.status.maxplayers}`;
    player_info.appendChild(player_info_label);
    player_info.appendChild(player_info_value);

    let arrow_icon = document.createElement("img");
    arrow_icon.classList.add("icon");
    arrow_icon.srcset = "/media/images/icons/kenney_arrow_right.png";

    card.appendChild(app_icon);
    card.appendChild(server_info);
    card.appendChild(player_info);
    card.appendChild(arrow_icon);

    this.host_element.appendChild(card);
  }

  update_server_item(hash) {
    // console.log(hash)

    let element = this.host_element.querySelector(`[data-uuid="${hash.id}"`);
    if (!element) {
      this.add_server_item(hash)
      return;
    }

    // Update ICON
    // Update NAME
    // Update MAP
    // Update PLAYERS
  }

  remove_server_item(hash) { }
};

window.addEventListener("load", (e) => {
  new ServerList();
});
