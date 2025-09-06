# Brainstorming

This file is used to document your thoughts, approaches and research conducted across all tasks in the Technical Assessment.

## Firmware

## Spyder

1. Initially I wanted to make a counter for invalid data to make sure that if it
   crosses a certain number, I would prompt the user to make better data acquisition.
   Later on I figured that having messages on the console was enough for whoever
   was handling the data. One major problem I faced while parsing data is that, even
   though I was handling valid data through the server, sometimes the ui displayed
   NaNs which means invalid data was slipping through. But through analyzing it
   even further I realized that the server was sending out data in the form of a message
   and often times the message could contain the data in string form which if accessed as
   a number would cause errors. Thus I tightened the type checking on page.tsx
   so that no invalid data can slip through and whenever it does instead of displaying it, the console is notified.

2. Implemented colors using a function for the ranges of color mentioned in the
   readme file with cn in numeric.tsx.

3. The dependency array for the useEffect which maintains the connection was empty
   and that is why the data regarding whether the server is connected or not was not being updated on the ui.

4. The data is rounded up to 3 decimal places using toFixed in numeric.tsx. For the ui,
   I implemented a console for everyone to check the error/alert messages and not just the
   developer. Implemented temp charts using recharts and charts from shadcn. The ui also
   shows the highs and lows, whether the temp is optimal or not and some basic data such
   as uptime and streaming info. Used copilot to code up the ui skeleton to speed up the
   process after implementing the logic. I'd say that observing the data right now would be
   pretty easy even for a non-technical person considering the amount of data displayed on
   the ui with the charts and simplified console.

## Cloud
