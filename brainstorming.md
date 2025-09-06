# Brainstorming

This file is used to document your thoughts, approaches and research conducted across all tasks in the Technical Assessment.

## Firmware

## Spyder

1. Initially I wanted to make a counter for invalid data to make sure that if it
   crosses a certain number, I would prompt the user to make better data acquisition
   but afterwards I figured having messages on the console was enough for whoever
   was handling the data. One major problem I faced while parsing data is that, even
   though I was handling valid data through the server, sometimes the frontend ui
   showed NaNs which means invalid data was slipping through. But through analyzing it
   even further I realized that the server was sending out data in the form of a message
   and often times the message could contain the data in string form which if accessed through
   a number directly would cause errors. Thus I tightened the data checking on page.tsx
   so that no invalid data can slip through and whenever it does, the console is notified.

2. Implemented the color using a function for the ranges of color mentioned in the
   readme file with cn.
3. The dependency array for the useEffect for maintaining the connection was empty
   and that is why the data regarding whether the server is connected or not was not being updated on the ui.

4. The data is rounded up to 3 decimal places using toFixed in numeric.tsx.

## Cloud
