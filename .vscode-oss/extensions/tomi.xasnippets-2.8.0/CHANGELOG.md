### v2.8.0

-   Added **daofoofull** snippet to generate four dao methods at once.
-   Fixed **daofoodelete** snippet by removing the leftover closing bracket '}' in the url behind 'id'.
-   Removed 'import React from "react" due to react 17 not needing it any longer.
-

### v2.7.0

-   Added new **ccfoo** snippet to generate an arrow function in react classes.
-   Added new **per** snippet to generate two lines that passes the local error and loading states (from useState).
-   Fixed description of **mstp**, **mdtp**, and **redux** snippets.

### v2.6.2

-   Fixed the **daofooget** promise return type not defaulting to array.
-   Changed the **usefnc** default function starting name from 'load' to 'init'. (It's used more often.)

### v2.6.1

-   Fixed the '\${id}' in daofoo methods not defaulting to 'id' string.

### v2.6.0

-   Added new **daofoopost** snippet for POST requests.
-   Added new **daofoopatch** snippet for PATCH requests.
-   Added new **daofoodelete** snippet for DELETE requests.
-   Added new **daofooget** snippet for GET requests.
-   Added new **daofoogetone** snippet for GET request that loads one item.
-   Added new **daofoobatch** snippet for requests implementing Promise.all() and an id list parameter.

### v2.5.6

-   Fixed number of cursors for ctx and ctxwc because 2,3, and 4 was basically '\${1}', just with some affix/suffix.
-   Added **sfcv** script which inherits every prop from the parent view (not from the controller like _sfhci_).
-   Removed unnecessary space in front of **iel** snippet.
-   Added missing 'export' in front of **tfoo** snippet.
-   Extended **usefnc** with the load section.
-   Fixed description of **daofoo** snippet.
-   Increment the last cursor count in the **model** which was incorrectly equal to the second.

### v2.5.4

-   Added documentation to uniquarrobj snippet.
-   Fixed **iel** script to do what was the original intention.
-   Fixed warning text in documentation to better explain/reflect my standpoint.
-   Removed _export default_ from **dao** script.

### v2.5.3

-   Fixed broken cursor position for 'uniqarr' snippet.

### v2.5.0

-   Added **sfcnie**, **pfcnie**, **pfc** component snippets.
