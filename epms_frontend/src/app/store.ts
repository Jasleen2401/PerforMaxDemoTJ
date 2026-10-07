import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import notificationReducer from "../features/notification/notificationSlice";
// import themeReducer from "../features/theme/themeSlice"
import { api } from "../services/api";
export const store = configureStore({
    reducer: {
        auth: authReducer,
        notification: notificationReducer,
        // theme: themeReducer,
        [api.reducerPath]: api.reducer,
    },
    devTools: {
        trace: true,
        traceLimit: 25,
        actionSanitizer: (action) => {
            if (action.type?.startsWith('api/')) {
                return {
                    ...action,
                    payload: 'RTK Query internal'
                };
            }
            return action;
        }
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;