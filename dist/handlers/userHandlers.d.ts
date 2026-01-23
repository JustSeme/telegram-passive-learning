import { TelegramContext, FrequencyOption } from '../types';
declare function handleStart(ctx: TelegramContext): Promise<void>;
declare function handleFieldSelection(ctx: TelegramContext): Promise<void>;
declare function handleFrequencySelection(ctx: TelegramContext): Promise<void>;
declare function handleProfile(ctx: TelegramContext): Promise<void>;
declare function handleEditField(ctx: TelegramContext): Promise<void>;
declare function handleEditFrequency(ctx: TelegramContext): Promise<void>;
declare function handleHistory(ctx: TelegramContext): Promise<void>;
declare const _default: {
    handleStart: typeof handleStart;
    handleFieldSelection: typeof handleFieldSelection;
    handleFrequencySelection: typeof handleFrequencySelection;
    handleProfile: typeof handleProfile;
    handleEditField: typeof handleEditField;
    handleEditFrequency: typeof handleEditFrequency;
    handleHistory: typeof handleHistory;
    FIELDS: string[];
    FREQUENCIES: FrequencyOption[];
};
export default _default;
//# sourceMappingURL=userHandlers.d.ts.map