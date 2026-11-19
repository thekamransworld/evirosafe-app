// Stands in for src/contexts.tsx in the UI render tests: the screens read their data from here.
export const ctx: { app: any; data: any; modal: any } = { app: {}, data: {}, modal: {} };
export const useAppContext = () => ctx.app;
export const useDataContext = () => ctx.data;
export const useModalContext = () => ctx.modal;
