declare module "*.svg" {
  import type React from "react";
  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  const src: string;
  // @ts-ignore
  export default src;
}

declare module "*.png" {
  const content: string;
  // @ts-ignore
  export default content;
}

declare module "*.jpg" {
  const content: string;
  // @ts-ignore
  export default content;
}

declare module "*.jpeg" {
  const content: string;
  // @ts-ignore
  export default content;
}

declare module "*.gif" {
  const content: string;
  // @ts-ignore
  export default content;
}

declare module "*.webp" {
  const content: string;
  // @ts-ignore
  export default content;
}
