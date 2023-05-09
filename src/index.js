import { md5 } from './md5';

const scastieApiRunUrl = "https://scastie.scala-lang.org/api/run";
const scastieApiEventsUrl = "https://scastie.scala-lang.org/api/progress-sse";

const defaultOptions = {
    _isWorksheetMode: true,
    target: {
        scalaVersion: "3.2.2",
        tpe: "Scala3"
    },
    libraries: [],
    librariesFromList: [],
    sbtConfigExtra: "scalacOptions ++= Seq()",
    sbtPluginsConfigExtra: "",
    isShowingInUserProfile: false
};

const scalaVersions = {
    scala3: {
        scalaVersion: "3.2.2",
        tpe: "Scala3"
    },
    scala2: {
        scalaVersion: "2.13.10",
        tpe: "Jvm"
    },
    "scala-js": {
        scalaVersion: "2.13.10",
        tpe: "Js"
    }
};


export default function scastie(input) {
    document.querySelectorAll(input).forEach(function (codeElement) {
        const id = genId(codeElement.innerText);
        codeElement.setAttribute("data-scastie-id", id);
        const code = codeElement.innerText;

        const options = {
            ...defaultOptions,
            code
        };
        sessionStorage.setItem(id, JSON.stringify(options));

        const container = addContainer(codeElement);
        addButton(container, "Compile", compileCode);
        addButton(container, "Options", showOptions);
        addDialog(codeElement, id);
        addConsole(codeElement, id);
    });
    addStyle();
}

function addContainer(element) {
    element.style.position = "relative";
    const container = document.createElement("div");
    container.classList.add("scastie-container");
    element.append(container);
    return container;
}

function addButton(element, text, action) {
    const id = element
        .closest("[data-scastie-id]")
        .getAttribute("data-scastie-id");
    const button = document.createElement("button");
    button.classList.add("scastie-button");
    button.innerText = text;
    button.addEventListener("click", () => action(id), false);
    element.append(button);
}

function saveOptions(dialogId) {
    const dialog = document.querySelector(`[data-scastie-dialog='${dialogId}']`);
    const form = dialog.querySelector('form');

    const selectedOption = form.elements['scala-target'].value;

    const libraryList = form.querySelectorAll('.data-library-input');
    const parsedLibraryList = Array.from(libraryList).map(libraryInput => {
        const groupId = libraryInput.querySelector('[name=library-group]').value
        const artifact = libraryInput.querySelector('[name=library-artifact]').value
        const version = libraryInput.querySelector('[name=library-version]').value

        const parsedLibrary = {
            groupId,
            artifact,
            version,
            target: scalaVersions[selectedOption]
        };

        return parsedLibrary;
    });

    const currentOptions = JSON.parse(sessionStorage.getItem(dialogId));
    const options = {
        ...currentOptions,
        libraries: parsedLibraryList,
        target: scalaVersions[selectedOption]
    };

    sessionStorage.setItem(dialogId, JSON.stringify(options));
};

function addDialog(codeElement, id) {
    const dialog = document.createElement("dialog");
    dialog.classList.add("scastie-dialog");
    dialog.setAttribute("data-scastie-dialog", id);
    dialog.innerHTML = dialogContent();

    dialog.addEventListener('close', () => saveOptions(id));

    const addButton = dialog.querySelector('.scastie-library-button-add');
    addButton.addEventListener('click', () => {
        const newLibraryInput = createLibraryInput();
        const libraryListContainer = dialog.querySelector('.scastie-library-list');
        libraryListContainer.append(newLibraryInput);
    });

    codeElement.append(dialog);
}

function createLibraryInput() {
    const libraryInput = document.createElement("div");
    libraryInput.classList.add("data-library-input");
    const content = `
        <label>
            Group id
            <input name="library-group" value="" />
        </label>
        <label>
            Artifact name
            <input name="library-artifact" value="" />
        </label>
        <label>
            Version
            <input name="library-version" value="" />
        </label>
        <button class="scastie-library-button-delete" type="button">❌</button>
    `;
    libraryInput.innerHTML = content;

    const deleteButton = libraryInput.querySelector('.scastie-library-button-delete');
    deleteButton.addEventListener('click', () => {
        deleteButton.parentElement.remove();
    });

    return libraryInput;
}

function dialogContent() {
    return `
        <form method="dialog">
            <fieldset>
                <legend>Scala target:</legend>
                <div>
                    <label>
                        <input type="radio" name="scala-target" value="scala3" checked/>
                        Scala 3
                    </label>
                    <label>
                        <input type="radio" name="scala-target" value="scala2" />
                        Scala 2
                    </label>
                    <label>
                        <input type="radio" name="scala-target" value="scala-js" />
                        Scala-js
                    </label>
                </div>
            </fieldset>
            <fieldset>
                <legend>Libraries:</legend>
                <div class="scastie-library-list"></div>
                <button class="scastie-library-button-add" type="button">Add</button>
            </fieldset>
            <div class="scastie-dialog-button-container">
                <button class="scastie-dialog-confirm-button" formmethod="dialog">Confirm</button>
            </div>
        </form>
    `;
}

function showOptions(id) {
    const dialog = document.querySelector(`[data-scastie-dialog='${id}']`);
    dialog.showModal();
}

function addConsole(codeElement, id) {
    const consoleContainer = document.createElement("pre");

    consoleContainer.classList.add("scastie-console");
    consoleContainer.setAttribute("data-scastie-console-id", id);
    consoleContainer.innerText = "";
    consoleContainer.style.display = "none";

    codeElement.style.marginBottom = "0px";
    codeElement.insertAdjacentElement('afterend', consoleContainer);
}


async function compileCode(id) {
    const codeElement = document.querySelector(`[data-scastie-id='${id}']`);

    const button = codeElement.querySelector(".scastie-button");
    button.innerText = "...";

    // Render console
    const scastieConsole = document.querySelector(
        `[data-scastie-console-id='${id}']`
    );
    scastieConsole.innerHTML = "";
    scastieConsole.style.display = "block";

    const savedOptions = sessionStorage.getItem(id);

    const requestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: savedOptions,
    };

    try {
        const response = await fetch(scastieApiRunUrl, requestOptions);
        const { base64UUID: token } = await response.json();
        await processStream(token, scastieConsole);
    } catch (error) {
        const errorMessage = `Error: ${error}`;
        console.error(errorMessage);
        addNewLine(scastieConsole, errorMessage);
    } finally {
        button.innerText = "Compile";
    }
}

async function processStream(token, scastieConsole) {
    const evtSource = new EventSource(`${scastieApiEventsUrl}/${token}`);
    console.group(`Reading from stream ${token}`);

    return new Promise((resolve, reject) => {
        evtSource.onmessage = (ev) => {
            if (!ev) {
                evtSource.close();
                reject("It wasn't possible to read compilation result");
            } else {
                const obj = JSON.parse(ev.data);

                if (
                    obj.sbtOutput !== undefined &&
                    obj.sbtOutput.line !== undefined &&
                    obj.sbtOutput.line.length > 0
                )
                    if (obj.sbtOutput.line.startsWith("[error]")) {
                        console.warn(obj.sbtOutput.line);
                        addNewLine(scastieConsole, obj.sbtOutput.line);
                    }
                    else
                        console.info(obj.sbtOutput.line);
                if (
                    obj.userOutput !== undefined &&
                    obj.userOutput.line !== undefined &&
                    obj.userOutput.line.length > 0
                )
                    addNewLine(scastieConsole, obj.userOutput.line);

                if (obj.isDone !== undefined && obj.isDone) {
                    console.groupEnd();
                    evtSource.close();
                    resolve();
                }
            }
        };
    });
}

function addNewLine(scastieConsole, text) {
    scastieConsole.innerHTML += `${text} <br/>`;
}

function addStyle() {
    const scastieStyle = document.createElement("style");
    scastieStyle.innerHTML = `
    .scastie-container  { position: absolute; width: 100%; height: 100%; display: flex; justify-content: flex-end; top: 0; left: 0; pointer-events: none;}
    .scastie-dialog  { text-align: center; white-space: normal; font-family: 'sans-serif';}
    .scastie-button  { border: 1px solid #000; padding: 4px; margin: 4px; height: fit-content; text-align: center; font-size: 8px; font-family: 'sans-serif'; cursor: pointer; pointer-events: auto;}
    .scastie-console { border: 1px solid #555; padding: 4px; background-color: #555; margin-top: 0px; color: antiquewhite; font-size: 9px; display:block;}`;

    const ref = document.querySelector("script");
    ref.parentNode.insertBefore(scastieStyle, ref);
}

function genId(content) {
    return md5(`${Date.now()}${content}`);
}
