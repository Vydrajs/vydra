import { ScopedElementsMixin } from "@open-wc/scoped-elements/lit-element.js";
import { LitElement } from "lit";

class VydraBaseElement extends LitElement {}

export const ScopedVydraElement = ScopedElementsMixin(VydraBaseElement);
