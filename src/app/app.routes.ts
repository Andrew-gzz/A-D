import { Routes } from '@angular/router';
import { LandingPage } from './components/landing-page/landing-page';
import { Experiments } from './components/experiments/experiments';

export const routes: Routes = [
    {
        path: '', component: LandingPage
    },
    {
        path: 'Experiments', component: Experiments
    }
];
