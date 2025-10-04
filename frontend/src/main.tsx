import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import { URLS } from "./config/navigation.ts";


import {
    createBrowserRouter,
    RouterProvider,
    useLocation,
    Outlet,
} from "react-router-dom";


import NotFoundPage from "../pages/General/NotFoundPage.tsx"


import SignUpFirm from "../components/Auth/SignUpFirm"
import SignUpInvestor from "../components/Auth/SignUpInvestor"
import SignIn from "../components/Auth/SignIn"
import HomePage from "../pages/General/HomePage"
import FirmHomePage from "../pages/Firm/FirmHomePage"
import InvestorHomePage from "../pages/Investor/InvestorHomePage"



import { PublicRoute } from "../routers/PublicRoute.tsx";
import { InvestorRoute } from "../routers/InvestorRoute.tsx";
import { FirmRoute } from "../routers/FirmRoute.tsx";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-east-2_PhoO99PTx",
      userPoolClientId: "3ipsjhg4ulpgbjfmb6nabvuml7",
    }
  }
});


const router = createBrowserRouter([
    {
        children: [
            // Public (unauthenticated) routes

            {
                path: URLS.homePage,
                element: (
                    <PublicRoute>
                        <HomePage />
                    </PublicRoute>
                ),
            },


            {
                path: URLS.firmSignUp,
                element: (
                    <PublicRoute>
                        <SignUpFirm />
                    </PublicRoute>
                ),
            },

            {
                path: URLS.investorSignUp,
                element: (
                    <PublicRoute>
                        <SignUpInvestor />
                    </PublicRoute>
                ),
            },

            {
                path: URLS.signIn,
                element: (
                    <PublicRoute>
                        <SignIn />
                    </PublicRoute>
                ),
            },

            // Firm
            {
                path: URLS.firmHomePage,
                element: (
                    <FirmRoute>
                        <FirmHomePage />
                    </FirmRoute>
                ),
            },

            // Investor routes
            {
                path: URLS.investorHomePage,
                element: (
                    <InvestorRoute>
                        <InvestorHomePage />
                    </InvestorRoute>
                ),
            },

            // 404
            {
                path: "*",
                element: <NotFoundPage />,
            },
        ],
    },
]);

createRoot(document.getElementById("root")!).render(
    <Authenticator.Provider>
        <RouterProvider router={router} />
    </Authenticator.Provider>
);
