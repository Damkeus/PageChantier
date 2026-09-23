import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";
import { NativeCameraCapture } from "./SchemaComponents";

/** Caméra native de l'app mobile Power Apps : sa WebView ignore l'attribut
 *  capture de <input type="file"> et ouvre la galerie. Hors app mobile,
 *  on laisse l'input HTML gérer l'appareil photo. */
function buildNativeCamera(context: ComponentFramework.Context<IInputs>): NativeCameraCapture | undefined {
    if (context.client.getClient() !== "Mobile" || typeof context.device?.captureImage !== "function") {
        return undefined;
    }
    return async () => {
        const file = await context.device.captureImage();
        if (!file?.fileContent) return null;
        const base64 = file.fileContent.startsWith("data:")
            ? file.fileContent
            : `data:${file.mimeType || "image/jpeg"};base64,${file.fileContent}`;
        return { base64, name: file.fileName || "photo.jpg" };
    };
}

export class MenuChantier implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement | null = null;
    private _notifyOutputChanged!: () => void;
    private _props: { projectJSON?: string; jsonSchema?: string } = {};
    private _outputs: IOutputs = {};
    private _captureImage?: NativeCameraCapture;



    /**
     * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
     * Data-set values are not initialized here, use updateView.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
     * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
     * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
     * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
     */
    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        this._notifyOutputChanged = notifyOutputChanged;
        this._container = container;
        this._captureImage = buildNativeCamera(context);

        // Add full height to container
        if (this._container) {
            this._container.style.height = "100%";
            this._container.style.width = "100%";
        }
    }

    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions.
     */
    public updateView(context: ComponentFramework.Context<IInputs>): void {
        // Don't render if container is not available
        if (!this._container) {
            console.warn('Container not initialized, skipping render');
            return;
        }

        const projectJSON = context.parameters.ProjectJSON.raw ?? undefined;
        const jsonSchema = context.parameters.JSONSchema.raw ?? undefined;
        const language = context.parameters.Language.raw ?? undefined;
        const currentUserName = context.parameters.CurrentUserName?.raw ?? undefined;
        // La barre de navigation d'un autre PCF recouvre le bas du contrôle :
        // on réserve sa hauteur pour que rien n'y passe dessous.
        const bottomSafeArea = context.parameters.BottomSafeArea?.raw ?? 70;
        const sharepointUrl = context.parameters.SharepointUrl?.raw ?? undefined;

        const onOutputChange = (key: string, value: string | boolean): void => {
            (this._outputs as Record<string, string | boolean>)[key] = value;
            this._notifyOutputChanged();
        };

        const props = {
            projectJSON,
            jsonSchema,
            language,
            currentUserName,
            bottomSafeArea,
            sharepointUrl,
            captureImage: this._captureImage,
            onOutputChange,
        };

        ReactDOM.render(
            React.createElement(App, props),
            this._container
        );
    }

    /**
     * It is called by the framework prior to a control receiving new data.
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
     */
    public getOutputs(): IOutputs {
        return this._outputs;
    }

    /**
     * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
     * i.e. cancelling any pending remote server calls, removing listeners, etc.
     */
    public destroy(): void {
        if (this._container) {
            ReactDOM.unmountComponentAtNode(this._container);
        }
    }
}
