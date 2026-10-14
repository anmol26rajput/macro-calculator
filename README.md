# Macro Calculator

A free calorie and macro calculator for lifters with desk jobs, by [@liftsw.anmol](https://www.instagram.com/liftsw.anmol/).

**Live:** https://free-calculator-liftswanmol.vercel.app/

Enter your sex, age, height, weight, activity level and goal, and it gives you:

- **BMR and TDEE**, from the Mifflin–St Jeor equation
- **Daily calories** for fat loss, maintenance or muscle gain
- **Protein, carbs and fat** in grams, with protein and fat based on your goal weight
- **BMI**, using either the WHO or South Asian cut-offs, plus your healthy weight range
- **A goal-weight timeline**, showing how many weeks it takes at your target intake
- Extras: protein per meal, daily fibre and water

Works in kg/cm or lb/ft-in. No sign-up, no tracking, nothing stored.

## Stack

One static `index.html` with plain HTML, CSS and JavaScript. No framework and no build step. Hosted on Vercel.

## Run locally

Open `index.html` in a browser.

To check the macro math (hand-worked cases plus a sweep of edge cases):

```bash
node check.mjs
```
