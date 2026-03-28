import * as Twodo from "twodo";

// Views
class Backroom extends Twodo.Component {}
class Frontroom extends Twodo.Component {}
class CardTerminal extends Twodo.Component {}
class Candelabra extends Twodo.Component {}
class Saw extends Twodo.Component {}
class Painting extends Twodo.Component {}

// Utility
class Interactable extends Twodo.Component {
    private _callbacks: (() => unknown)[] = [];
    disabled = false;

    registerCallback(callback: () => unknown) {
        this._callbacks.push(callback);
    }

    trigger() {
        if (this.disabled) {
            return;
        }

        this._callbacks.forEach((callback) => callback());
    }
}

function showView(view: new (parent: Twodo.Entity) => Twodo.Component) {
    // Reset state
    scene.ecs.query([Twodo.Sprite]).forEach(([sprite]) => {
        sprite.hidden = true;
    });

    scene.ecs.query([Interactable]).forEach(([interactable]) => {
        interactable.disabled = true;
    });

    // Turn on elements in view
    scene.ecs.query([view, Twodo.Sprite]).forEach(([, sprite]) => {
        sprite.hidden = false;
    });

    scene.ecs.query([view, Interactable]).forEach(([, interactable]) => {
        interactable.disabled = false;
    });

    if (view == Frontroom) {
        if (screwsLeft == 0) {
            painting[3].hidden = true;
        }
        exitView.classList.add("hidden");
    } else {
        exitView.classList.remove("hidden");
    }

    if (view == Candelabra) {
        scene.ecs.query([Candle, Twodo.Sprite]).forEach(([candle, sprite]) => {
            sprite.hidden = !candles[candle.index];
        });
    }

    if (view == Backroom && inventory.items.screwdriver) {
        screwdriver[2].hidden = true;
    }

    code = "";
    safeCode = "";
    sequence = "";
}

const exitView = document.getElementById("exit_view")!;

exitView.onclick = () => {
    showView(Frontroom);
};

const click = new Audio("./click.wav");
const grab = new Audio("./grab.wav");
const error = new Audio("./error.wav");

// Scene setup
const canvas = document.getElementById("game_canvas") as HTMLCanvasElement;
const scene = new Twodo.Scene(canvas!);
const camera = scene.ecs.createEntity(
    [Twodo.Camera, canvas!.width, canvas!.height],
    [Twodo.Transform],
);
scene.activeCamera = camera;

// Inventory

type Items = {
    card: boolean;
    receipt: boolean;
    tape: boolean;
    stick: boolean;
    screwdriver: boolean;
    key: boolean;
};

const inventory_target: {
    items: Items;
    selectedItem: keyof Items | null;
} = {
    items: {
        card: false,
        receipt: false,
        tape: false,
        stick: false,
        screwdriver: false,
        key: false,
    },
    selectedItem: null,
};

const inventoryCallbacks: (() => unknown)[] = [];

// Detects changes to inventory and runs callbacks
const inventory = new Proxy(inventory_target, {
    // Typescript spaget
    get(object, item) {
        if (
            typeof object[item as keyof typeof object] == "object" &&
            object[item as keyof typeof object] != null
        ) {
            return new Proxy(
                object[item as keyof typeof object] as Items,
                this as ProxyHandler<Items>,
            );
        } else {
            return object[item as keyof typeof object];
        }
    },
    set(object, item, value) {
        object[item as keyof typeof object] = value;

        inventoryCallbacks.forEach((callback) => callback());
        return true;
    },
});

const inventoryElement = document.getElementById("inventory")!;

inventoryCallbacks.push(() => {
    // Clear inventory element
    inventoryElement.innerHTML = "";

    for (let item in inventory.items) {
        // Add item to hotbar if in inventory
        if (inventory.items[item as keyof Items] == true) {
            const itemElement = document.createElement("button");

            itemElement.style.backgroundImage = `url('./${item}.webp')`;
            itemElement.style.backgroundSize = "contain";
            itemElement.style.backgroundRepeat = "no-repeat";
            itemElement.style.backgroundPosition = "center";
            itemElement.classList.add("inventory-item");

            if (item == inventory.selectedItem) {
                itemElement.classList.add("selected-item");
            }

            itemElement.onclick = () => {
                if (item == inventory.selectedItem) {
                    // Deselect if selected
                    inventory.selectedItem = null;

                    Array.from(
                        document.getElementsByClassName("item_preview"),
                    ).forEach((element) => {
                        element.remove();
                    });
                } else {
                    // Select if not selected
                    inventory.selectedItem = item as keyof Items;

                    // Show item preview if item is previewable
                    if (item == "receipt") {
                        const itemPreview = document.createElement("div");
                        const itemImage = document.createElement("img");

                        itemImage.src = `./${item}.webp`;

                        itemPreview.appendChild(itemImage);

                        itemPreview.classList.add("item-preview");

                        inventoryElement.appendChild(itemPreview);
                    }
                }
            };
            inventoryElement.appendChild(itemElement);
        }
    }
});

// ------------------- Entities ------------------- //

// ------------------- Backroom ------------------- //
const backroom = scene.ecs.createEntity(
    [Backroom],
    [Twodo.Transform],
    [Twodo.Sprite, "./backroom.webp"],
);

backroom[1].depth = 1;
backroom[1].scale = new Twodo.Vector2(32, 18);

const screwdriver = scene.ecs.createEntity(
    [Backroom],
    [Twodo.Transform],
    [Twodo.Sprite, "./screwdriver.webp"],
);

screwdriver[1].scale = new Twodo.Vector2(1.41 * 1.3, 0.44 * 1.3);

// Key hole
const keyHole = scene.ecs.createEntity(
    [Backroom],
    [Twodo.Transform],
    [Twodo.Sprite, "./keyhole.webp"],
);

keyHole[1].depth = 0;
keyHole[1].scale = new Twodo.Vector2(32, 18);

// ------------------ Frontroom ------------------- //
const frontRoom = scene.ecs.createEntity(
    [Frontroom],
    [Twodo.Transform],
    [Twodo.Sprite, "./front-room.webp"],
);

frontRoom[1].scale = new Twodo.Vector2(19.2 * 1.3, 10.8 * 1.3);

// Door
const door = scene.ecs.createEntity(
    [Frontroom],
    [Interactable],
    [Twodo.Transform],
    [Twodo.Sprite, "./door.webp"],
);

door[2].position = new Twodo.Vector2(0.88, 0.1);
door[2].scale = new Twodo.Vector2(2.95 * 1.3, 5.21 * 1.3);

door[1].registerCallback(() => {
    if (inventory.selectedItem == "key") {
        scene.ecs.deleteEntity(door[0].parent!);
        setTimeout(() => {
            const congrat = scene.ecs.createEntity(
                [Twodo.Transform],
                [Twodo.Sprite, "./congrat.webp"],
            );

            congrat[0].scale = new Twodo.Vector2(19.2 * 1.3, 10.8 * 1.3);
        }, 2000);
    } else {
        showView(Backroom);
    }
});

// Card
const card = scene.ecs.createEntity(
    [Frontroom],
    [Interactable],
    [Twodo.Transform],
    [Twodo.Sprite, "./card.webp"],
);

card[2].position = new Twodo.Vector2(-1, -4.2);
card[2].scale = new Twodo.Vector2(0.73 * 1.3, 0.36 * 1.3);

card[1].registerCallback(() => {
    inventory.items.card = true;
    grab.play();
    scene.ecs.deleteEntity(card[0].parent!);
});

// Card terminal
const cardTerminal = scene.ecs.createEntity(
    [Frontroom],
    [Interactable],
    [Twodo.Transform],
    [Twodo.Sprite, "./card-terminal.webp"],
);

cardTerminal[2].position = new Twodo.Vector2(-6.3, -3.5);
cardTerminal[2].scale = new Twodo.Vector2(0.8 * 1.3, 0.4 * 1.3);

cardTerminal[1].registerCallback(() => {
    showView(CardTerminal);
});

// Candelabra
const candelabra = scene.ecs.createEntity(
    [Frontroom],
    [Interactable],
    [Twodo.Transform],
    [Twodo.Sprite, "./candelabra.webp"],
);

candelabra[2].position = new Twodo.Vector2(-4, -1.2);
candelabra[2].scale = new Twodo.Vector2(1.22 * 1.3, 1.12 * 1.3);

candelabra[1].registerCallback(() => {
    showView(Candelabra);
});

// Chair
const chair = scene.ecs.createEntity(
    [Frontroom],
    [Twodo.Transform],
    [Twodo.Sprite, "./chair.webp"],
);

chair[1].position = new Twodo.Vector2(8.3, -2.5);
chair[1].scale = new Twodo.Vector2(2.79 * 1.3, 4.29 * 1.3);

// Cable
const cable = scene.ecs.createEntity(
    [Frontroom],
    [Interactable],
    [Twodo.Transform],
    [Twodo.Sprite, "./broken-cable.webp"],
);

let cableFixed = false;

cable[2].position = new Twodo.Vector2(11.3, -4.45);
cable[2].scale = new Twodo.Vector2(1.52 * 1.3, 2.23 * 1.3);

cable[1].registerCallback(() => {
    if (inventory.selectedItem == "tape") {
        cable[3].src = "fixed-cable.webp";
        cableFixed = true;
    }
});

// Saw
const saw = scene.ecs.createEntity(
    [Frontroom],
    [Interactable],
    [Twodo.Transform],
    [Twodo.Sprite, "./saw.webp"],
);

saw[2].position = new Twodo.Vector2(9.7, -4.7);
saw[2].scale = new Twodo.Vector2(1.06 * 1.3, 0.8 * 1.3);

saw[1].registerCallback(() => {
    showView(Saw);
});

// Painting
const painting = scene.ecs.createEntity(
    [Frontroom],
    [Interactable],
    [Twodo.Transform],
    [Twodo.Sprite, "./painting.webp"],
);

painting[2].position = new Twodo.Vector2(-3.4, 1.4);
painting[2].scale = new Twodo.Vector2(2.57 * 1.3, 2.32 * 1.3);

painting[1].registerCallback(() => {
    showView(Painting);
});

// Under door
const underDoor = scene.ecs.createEntity(
    [Frontroom],
    [Interactable],
    [Twodo.Transform],
);

underDoor[2].position = new Twodo.Vector2(0.88, -4);
underDoor[2].scale = new Twodo.Vector2(2.95 * 1.3, 2);

underDoor[1].registerCallback(() => {
    if (inventory.selectedItem == "stick") {
        inventory.items.screwdriver = true;
        grab.play();
    }
});

// ---------------- Card terminal ----------------- //
const cardTerminalLarge = scene.ecs.createEntity(
    [CardTerminal],
    [Twodo.Transform],
    [Twodo.Sprite, "./card-terminal-large.webp"],
);

cardTerminalLarge[1].scale = new Twodo.Vector2(16, 9);

class Button extends Twodo.Component {
    digit: string;

    constructor(parent: Twodo.Entity, digit: number) {
        super(parent);
        this.digit = digit.toString();
    }
}

for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
        const cardTerminalButton = scene.ecs.createEntity(
            [CardTerminal],
            [Button, (2 - y) * 3 + x + 1],
            [Interactable],
            [Twodo.Transform],
        );

        cardTerminalButton[3].position = new Twodo.Vector2(x - 1, y - 1.9);
    }
}

{
    const cardTerminalButton = scene.ecs.createEntity(
        [CardTerminal],
        [Button, 0],
        [Interactable],
        [Twodo.Transform],
    );

    cardTerminalButton[3].position = new Twodo.Vector2(0, -3);
}

const cardTerminalEnter = scene.ecs.createEntity(
    [CardTerminal],
    [Interactable],
    [Twodo.Transform],
);

cardTerminalEnter[2].position = new Twodo.Vector2(1, -3);

const correctCode = "2429";
let code = "";

function submitCode() {
    if (code == correctCode && inventory.selectedItem == "card") {
        inventory.items.receipt = true;
        grab.play();
    } else {
        error.play();
    }
    code = "";
}

scene.ecs
    .query([CardTerminal, Button, Interactable])
    .forEach(([, button, interactable]) => {
        interactable.registerCallback(() => {
            click.play();
            if (code.length >= 4) {
                return;
            }
            code += button.digit;
        });
    });

cardTerminalEnter[1].registerCallback(() => {
    submitCode();
});

// ------------------ Candelabra ------------------ //
class Candle extends Twodo.Component {
    index: number;

    constructor(parent: Twodo.Entity, index: number) {
        super(parent);
        this.index = index;
    }
}

const candelabraLarge = scene.ecs.createEntity(
    [Candelabra],
    [Interactable],
    [Twodo.Transform],
    [Twodo.Sprite, "./candelabra-large.webp"],
);

candelabraLarge[2].scale = new Twodo.Vector2(16, 9);

const candlePositions = [
    new Twodo.Vector2(-3.6, 1.7),
    new Twodo.Vector2(-2.46, 2.21),
    new Twodo.Vector2(-1.22, 2.7),
    new Twodo.Vector2(0, 3.22),
    new Twodo.Vector2(1.15, 2.7),
    new Twodo.Vector2(2.3, 2.24),
    new Twodo.Vector2(3.5, 1.75),
];

const correctCandles = [true, false, true, false, true, true, true];
const candles = [true, false, false, true, true, false, false];

for (let i = 0; i < candlePositions.length; i++) {
    const candle = scene.ecs.createEntity(
        [Candelabra],
        [Candle, i],
        [Interactable],
        [Twodo.Transform],
        [Twodo.Sprite, "./candle.webp"],
    );

    candle[3].position = candlePositions[i];
    candle[3].scale = new Twodo.Vector2(1.1, 1.3);

    candle[2].registerCallback(() => {
        candles[i] = !candles[i];
        candle[4].hidden = !candles[i];
        click.play();

        if (candles.toString() == correctCandles.toString()) {
            inventory.items.tape = true;
            grab.play();
        }
    });
}

// --------------------- Saw ---------------------- //
const sawLarge = scene.ecs.createEntity(
    [Saw],
    [Twodo.Transform],
    [Twodo.Sprite, "./saw-large.webp"],
);

sawLarge[1].scale = new Twodo.Vector2(32, 18);

const sawButtonPositions = [
    new Twodo.Vector2(2.3, 4.5),
    new Twodo.Vector2(5.8, 4.3),
    new Twodo.Vector2(4.3, 1.8),
    new Twodo.Vector2(7.9, 2),
    new Twodo.Vector2(3.5, -1.1),
    new Twodo.Vector2(7.4, -0.9),
];

let sequence = "";
const correctSequence = "2233010154";

sawButtonPositions.forEach((position, index) => {
    const button = scene.ecs.createEntity(
        [Saw],
        [Interactable],
        [Twodo.Transform],
    );

    button[2].position = position;
    button[2].scale = new Twodo.Vector2(2.5, 2.5);

    button[1].registerCallback(() => {
        click.play();

        if (!cableFixed) {
            return;
        }

        sequence += index;
        if (sequence.length >= 10) {
            if (sequence == correctSequence) {
                inventory.items.stick = true;
                chair[2].src = "./broken-chair.webp";
                grab.play();
            } else {
                error.play();
            }
            sequence = "";
        }
    });
});

// ------------------- Painting ------------------- //
const safe = scene.ecs.createEntity(
    [Painting],
    [Twodo.Transform],
    [Twodo.Sprite, "./safe.webp"],
);

safe[1].scale = new Twodo.Vector2(30, 16);

for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
        const safeButton = scene.ecs.createEntity(
            [Painting],
            [Button, (2 - y) * 3 + x + 1],
            [Interactable],
            [Twodo.Transform],
        );

        safeButton[3].position = new Twodo.Vector2(
            x / 1.5 - 1.5,
            y / 1.6 + 0.8,
        );
        safeButton[3].scale = new Twodo.Vector2(0.7, 0.7);
    }
}

{
    const safeButton = scene.ecs.createEntity(
        [Painting],
        [Button, 0],
        [Interactable],
        [Twodo.Transform],
    );

    safeButton[3].position = new Twodo.Vector2(-0.9, 0.24);
    safeButton[3].scale = new Twodo.Vector2(0.7, 0.7);
}

const safeEnter = scene.ecs.createEntity(
    [Painting],
    [Interactable],
    [Twodo.Transform],
);

safeEnter[2].position = new Twodo.Vector2(-0.15, 0.24);
safeEnter[2].scale = new Twodo.Vector2(0.7, 0.7);

const correctSafeCode = "190655";
let safeCode = "";

function submit_safe_code() {
    if (safeCode == correctSafeCode) {
        inventory.items.key = true;
        safe[2].src = "./open-safe.webp";
        grab.play();
    } else {
        error.play();
    }
    safeCode = "";
}

scene.ecs
    .query([Painting, Button, Interactable])
    .forEach(([, button, interactable]) => {
        interactable.registerCallback(() => {
            if (screwsLeft != 0) {
                return;
            }

            click.play();

            if (safeCode.length >= 6) {
                return;
            }

            safeCode += button.digit;
        });
    });

safeEnter[1].registerCallback(() => {
    click.play();
    submit_safe_code();
});

const paintingLarge = scene.ecs.createEntity(
    [Painting],
    [Twodo.Transform],
    [Twodo.Sprite, "./painting-large.webp"],
);

paintingLarge[1].scale = new Twodo.Vector2(15, 10);

const screwPositions = [
    new Twodo.Vector2(-6.6, -3.9),
    new Twodo.Vector2(6.1, -4),
    new Twodo.Vector2(6.5, 3.8),
    new Twodo.Vector2(-6.3, 4.1),
];

let screwsLeft = 4;

screwPositions.forEach((position) => {
    const screw = scene.ecs.createEntity(
        [Painting],
        [Interactable],
        [Twodo.Transform],
        [Twodo.Sprite, "./screw.webp"],
    );

    screw[2].position = position;

    screw[1].registerCallback(() => {
        if (inventory.selectedItem == "screwdriver") {
            scene.ecs.deleteEntity(screw[0].parent);
            screwsLeft--;
            click.play();
            if (screwsLeft == 0) {
                scene.ecs.deleteEntity(paintingLarge[0].parent);
            }
        }
    });
});

// ------------------ !Entities ------------------- //

// Handle clicking
scene.input.mouse.registerCallback("leftClick", () => {
    const worldSpace = scene.input.mouse.position.clipSpaceToWorldSpace(scene);
    scene.ecs
        .query([Interactable, Twodo.Transform])
        .forEach(([interactable, transform]) => {
            const bottomLeft = new Twodo.Vector2(
                transform.position.x - transform.scale.x / 2,
                transform.position.y - transform.scale.y / 2,
            );

            const topRight = new Twodo.Vector2(
                transform.position.x + transform.scale.x / 2,
                transform.position.y + transform.scale.y / 2,
            );

            if (worldSpace.isWithin(bottomLeft, topRight)) {
                interactable.trigger();
            }
        });
});

showView(Frontroom);

function update() {
    scene.draw();

    // Key hole look controls
    if (!keyHole[2].hidden) {
        keyHole[1].position = new Twodo.Vector2(
            -scene.input.mouse.position.x / 2,
            scene.input.mouse.position.y / 2,
        );

        backroom[1].position = new Twodo.Vector2(
            scene.input.mouse.position.x * 13,
            -scene.input.mouse.position.y * 5,
        );

        screwdriver[1].position = new Twodo.Vector2(
            scene.input.mouse.position.x * 13,
            -scene.input.mouse.position.y * 5 - 7,
        );
    }

    requestAnimationFrame(update);
}

update();
