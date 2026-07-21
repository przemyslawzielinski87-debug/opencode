import { onMount, type ComponentProps, splitProps } from "solid-js"

const icons = {
  edit: {
    viewBox: "0 0 16 16",
    body: `<path d="M13.5555 8.21534V13.5556H2.44434L2.44434 2.4445H7.78462M6.88878 9.11119C6.88878 9.11119 8.96327 9.0367 9.69678 8.3032L14.0301 3.96986C14.5824 3.4176 14.5824 2.52213 14.0301 1.96986C13.4778 1.4176 12.5824 1.4176 12.0301 1.96986L7.69678 6.3032C7.00513 6.99484 6.88878 9.11119 6.88878 9.11119Z" stroke="currentColor"/>`,
  },
  "folder-add-left": {
    viewBox: "0 0 16 16",
    body: `<path d="M7.5 13.3333H1.5V2H6.83333L8.83333 4H14.8333V6M10.1667 11.3333H15.5M12.8333 8.66667V14" stroke="currentColor" stroke-miterlimit="10" stroke-linecap="square"/>`,
  },
  "grid-plus": {
    viewBox: "0 0 16 16",
    body: `<path d="M13.9948 11.668H9.32812M11.6641 9.33203V13.9987M6.66667 9.33203V13.9987H2V9.33203H6.66667ZM6.66667 2V6.66667H2V2H6.66667ZM13.9948 2V6.66667H9.32812V2H13.9948Z" stroke="currentColor" stroke-miterlimit="10" stroke-linecap="square"/>`,
  },
  help: {
    viewBox: "0 0 16 16",
    body: `<path d="M6.33345 6.33349V5.00015H9.66679V7.00015L8.00015 8.00015V9.66679M8.27485 11.6819H7.71897M14.4446 8.00011C14.4446 11.5593 11.5593 14.4446 8.00011 14.4446C4.44094 14.4446 1.55566 11.5593 1.55566 8.00011C1.55566 4.44094 4.44094 1.55566 8.00011 1.55566C11.5593 1.55566 14.4446 4.44094 14.4446 8.00011Z" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "sidebar-right": {
    viewBox: "0 0 20 20",
    body: `<path d="M2.91536 2.91406H2.36536V2.36406H2.91536V2.91406ZM2.91536 17.0807V17.6307H2.36536V17.0807H2.91536ZM17.082 17.0807H17.632V17.6307H17.082V17.0807ZM17.082 2.91406V2.36406H17.632V2.91406H17.082ZM6.9987 2.91406H6.4487V2.36406H6.9987V2.91406ZM6.9987 17.0807V17.6307H6.4487V17.0807H6.9987ZM2.91536 2.91406H3.46536V17.0807H2.91536H2.36536V2.91406H2.91536ZM2.91536 17.0807V16.5307H17.082V17.0807V17.6307H2.91536V17.0807ZM17.082 17.0807H16.532V2.91406H17.082H17.632V17.0807H17.082ZM17.082 2.91406V3.46406H2.91536V2.91406V2.36406H17.082V2.91406ZM6.9987 2.91406H7.5487V17.0807H6.9987H6.4487V2.91406H6.9987ZM17.082 17.0807L17.082 17.6307L6.9987 17.6307V17.0807V16.5307L17.082 16.5307L17.082 17.0807ZM6.9987 2.91406V2.36406H17.082V2.91406V3.46406H6.9987V2.91406Z" fill="currentColor"/>`,
  },
  status: {
    viewBox: "0 0 20 20",
    body: `<path d="M2 10V18H18V10M2 10V2H18V10M2 10H18M5 6H9M5 14H9" stroke="currentColor"/>`,
  },
  "status-active": {
    viewBox: "0 0 20 20",
    body: `<path d="M18 2H2V10H18V2Z" fill="currentColor" fill-opacity="0.1"/><path d="M2 18H18V10H2V18Z" fill="currentColor" fill-opacity="0.1"/><path d="M2 10V18H18V10M2 10V2H18V10M2 10H18M5 6H9M5 14H9" stroke="currentColor"/>`,
  },
  "magnifying-glass": {
    viewBox: "0 0 16 16",
    body: `<path d="M14 14L10.3454 10.3454M6.88889 11.7778C9.58889 11.7778 11.7778 9.58889 11.7778 6.88889C11.7778 4.18889 9.58889 2 6.88889 2C4.18889 2 2 4.18889 2 6.88889C2 9.58889 4.18889 11.7778 6.88889 11.7778Z" stroke="currentColor"/>`,
  },
  menu: {
    viewBox: "0 0 16 16",
    body: `<path d="M2 8H14M2 4.664H14M2 11.336H14" stroke="currentColor"/>`,
  },
  plus: {
    viewBox: "0 0 16 16",
    body: `<path d="M8 2.88867V13.1109" stroke="currentColor" stroke-linejoin="round"/><path d="M2.88867 8H13.1109" stroke="currentColor" stroke-linejoin="round"/>`,
  },
  "settings-gear": {
    viewBox: "0 0 16 16",
    body: `<path d="M7.99998 1.3335L14 4.66683V11.3335L7.99998 14.6668L2 11.3335V4.66683L7.99998 1.3335Z" stroke="currentColor"/><path d="M9.99998 8.00016C9.99998 9.10476 9.10458 10.0002 7.99998 10.0002C6.89538 10.0002 5.99998 9.10476 5.99998 8.00016C5.99998 6.89556 6.89538 6.00016 7.99998 6.00016C9.10458 6.00016 9.99998 6.89556 9.99998 8.00016Z" stroke="currentColor"/>`,
  },
  "chevron-down": {
    viewBox: "0 0 16 16",
    body: `<path d="M5 6.5L8 9.5L11 6.5" stroke="currentColor"/>`,
  },
  close: {
    viewBox: "0 0 20 20",
    body: `<path d="M14.4446 5.55566L5.55566 14.4446M5.55566 5.55566L14.4446 14.4446" stroke="currentColor" stroke-linejoin="round"/>`,
  },
  "xmark-small": {
    viewBox: "0 0 16 16",
    body: `<path d="M4.25 11.75L11.75 4.25M11.75 11.75L4.25 4.25" stroke="currentColor"/>`,
  },
  "outline-chevron-down": {
    viewBox: "0 0 16 16",
    body: `<path d="M5 6.5L8 9.5L11 6.5" stroke="currentColor"/>`,
  },
  "outline-dots": {
    viewBox: "0 0 16 16",
    body: `<path d="M2.5 7.5H3.5V8.5H2.5V7.5Z" stroke="currentColor"/><path d="M7.5 7.5H8.5V8.5H7.5V7.5Z" stroke="currentColor"/><path d="M12.5 7.5H13.5V8.5H12.5V7.5Z" stroke="currentColor"/>`,
  },
  "check-circle": {
    viewBox: "0 0 20 20",
    body: `<path d="M6.5 10.25L9 12.75L13.5 8.25M17.5 10C17.5 14.1421 14.1421 17.5 10 17.5C5.85786 17.5 2.5 14.1421 2.5 10C2.5 5.85786 5.85786 2.5 10 2.5C14.1421 2.5 17.5 5.85786 17.5 10Z" stroke="currentColor" fill="none"/>`,
  },
  dot: {
    viewBox: "0 0 20 20",
    body: `<circle cx="10" cy="10" r="5" fill="currentColor"/>`,
  },
  "alert-triangle": {
    viewBox: "0 0 20 20",
    body: `<path d="M10 3.5L17 16H3L10 3.5Z" stroke="currentColor" fill="none"/><path d="M10 8V11.5M10 13.5H10.01" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "x-octagon": {
    viewBox: "0 0 20 20",
    body: `<path d="M6.34315 3.34315L3.34315 6.34315C2.79086 6.89544 2.5 7.6043 2.5 8.34315V11.6569C2.5 12.3957 2.79086 13.1046 3.34315 13.6569L6.34315 16.6569C6.89544 17.2091 7.6043 17.5 8.34315 17.5H11.6569C12.3957 17.5 13.1046 17.2091 13.6569 16.6569L16.6569 13.6569C17.2091 13.1046 17.5 12.3957 17.5 11.6569V8.34315C17.5 7.6043 17.2091 6.89544 16.6569 6.34315L13.6569 3.34315C13.1046 2.79086 12.3957 2.5 11.6569 2.5H8.34315C7.6043 2.5 6.89544 2.79086 6.34315 3.34315Z" stroke="currentColor" fill="none"/><path d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5" stroke="currentColor" stroke-linecap="square"/>`,
  },
  loader: {
    viewBox: "0 0 20 20",
    body: `<path d="M10 2.5V5.5M10 14.5V17.5M2.5 10H5.5M14.5 10H17.5M4.6967 4.6967L6.81802 6.81802M13.182 13.182L15.3033 15.3033M4.6967 15.3033L6.81802 13.182M13.182 6.81802L15.3033 4.6967" stroke="currentColor" stroke-linecap="square" opacity="0.6"/>`,
  },
  clock: {
    viewBox: "0 0 20 20",
    body: `<circle cx="10" cy="10" r="7" stroke="currentColor" fill="none"/><path d="M10 6V10L13 12" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "minus-circle": {
    viewBox: "0 0 20 20",
    body: `<circle cx="10" cy="10" r="7" stroke="currentColor" fill="none"/><path d="M7 10H13" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "help-circle": {
    viewBox: "0 0 20 20",
    body: `<circle cx="10" cy="10" r="7" stroke="currentColor" fill="none"/><path d="M10 13.5V14M10 13.5H9.99M10 6.5C8.5 6.5 8 7.5 8 8" stroke="currentColor" stroke-linecap="square"/>`,
  },
  server: {
    viewBox: "0 0 20 20",
    body: `<rect x="2.5" y="3.5" width="15" height="5" rx="1" stroke="currentColor" fill="none"/><rect x="2.5" y="11.5" width="15" height="5" rx="1" stroke="currentColor" fill="none"/><circle cx="5" cy="6" r="1" fill="currentColor"/><circle cx="5" cy="14" r="1" fill="currentColor"/>`,
  },
  puzzle: {
    viewBox: "0 0 20 20",
    body: `<path d="M4 7.5C4 6.67157 4.67157 6 5.5 6H7V4.5C7 3.67157 7.67157 3 8.5 3H9.5C10.3284 3 11 3.67157 11 4.5V6H12.5C13.3284 6 14 6.67157 14 7.5V9H15.5C16.3284 9 17 9.67157 17 10.5V11.5C17 12.3284 16.3284 13 15.5 13H14V14.5C14 15.3284 13.3284 16 12.5 16H5.5C4.67157 16 4 15.3284 4 14.5V7.5Z" stroke="currentColor" fill="none"/>`,
  },
  plugin: {
    viewBox: "0 0 20 20",
    body: `<rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" fill="none"/><path d="M7 7H13M7 10H13M7 13H11" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "code-2": {
    viewBox: "0 0 20 20",
    body: `<path d="M6 7L3 10L6 13M14 7L17 10L14 13" stroke="currentColor" stroke-linecap="square"/><path d="M9 16L11 4" stroke="currentColor" stroke-linecap="square" opacity="0.5"/>`,
  },
  bot: {
    viewBox: "0 0 20 20",
    body: `<rect x="3" y="6" width="14" height="10" rx="2" stroke="currentColor" fill="none"/><path d="M7 3V6M13 3V6" stroke="currentColor" stroke-linecap="square"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="12.5" cy="11" r="1" fill="currentColor"/>`,
  },
  brain: {
    viewBox: "0 0 20 20",
    body: `<path d="M10 3.5C7.5 3.5 6.5 5.5 6.5 7C6.5 8.5 7.5 9.5 8 10M10 3.5C12.5 3.5 13.5 5.5 13.5 7C13.5 8.5 12.5 9.5 12 10M8 10C6 10.5 5 12 5 13.5C5 15 6.5 16.5 8 16C9 15.5 9.5 15 10 14.5M12 10C14 10.5 15 12 15 13.5C15 15 13.5 16.5 12 16C11 15.5 10.5 15 10 14.5M10 14.5V17.5" stroke="currentColor" fill="none"/>`,
  },
  "shield-check": {
    viewBox: "0 0 20 20",
    body: `<path d="M10 3L17 6V10C17 14 13.5 17 10 18C6.5 17 3 14 3 10V6L10 3Z" stroke="currentColor" fill="none"/><path d="M7 10L9.5 12.5L13.5 8.5" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "clipboard-check": {
    viewBox: "0 0 20 20",
    body: `<rect x="4.5" y="4.5" width="11" height="13" rx="1.5" stroke="currentColor" fill="none"/><path d="M7.5 3.5C7.5 2.94772 7.94772 2.5 8.5 2.5H11.5C12.0523 2.5 12.5 2.94772 12.5 3.5V5.5H7.5V3.5Z" stroke="currentColor" fill="none"/><path d="M7.5 10.5L9.5 12.5L12.5 9.5" stroke="currentColor" stroke-linecap="square"/>`,
  },
  activity: {
    viewBox: "0 0 20 20",
    body: `<path d="M3 10H6L9 5L12 15L15 10H17" stroke="currentColor" stroke-linecap="square" stroke-linejoin="round"/>`,
  },
  shield: {
    viewBox: "0 0 20 20",
    body: `<path d="M10 3L17 6V10C17 14 13.5 17 10 18C6.5 17 3 14 3 10V6L10 3Z" stroke="currentColor" fill="none"/>`,
  },
  "play-circle": {
    viewBox: "0 0 20 20",
    body: `<circle cx="10" cy="10" r="7" stroke="currentColor" fill="none"/><path d="M9 7L13 10L9 13V7Z" fill="currentColor"/>`,
  },
  cpu: {
    viewBox: "0 0 20 20",
    body: `<rect x="5" y="5" width="10" height="10" rx="1" stroke="currentColor" fill="none"/><path d="M8 2V5M12 2V5M8 15V18M12 15V18M2 8H5M15 8H18M2 12H5M15 12H18" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "git-branch": {
    viewBox: "0 0 20 20",
    body: `<circle cx="6" cy="6" r="2" stroke="currentColor" fill="none"/><circle cx="6" cy="14" r="2" stroke="currentColor" fill="none"/><circle cx="14" cy="8" r="2" stroke="currentColor" fill="none"/><path d="M6 8V12M6 12C6 10 8 10 10 10C12 10 14 10 14 8" stroke="currentColor"/>`,
  },
  "git-compare": {
    viewBox: "0 0 20 20",
    body: `<path d="M6 4L3 7L6 10M6 10V8C6 6 8 6 10 6" stroke="currentColor" stroke-linecap="square"/><path d="M14 16L17 13L14 10M14 10V12C14 14 12 14 10 14" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "file-code": {
    viewBox: "0 0 20 20",
    body: `<path d="M3 4C3 3.17157 3.67157 2.5 4.5 2.5H11.5L17 8V16C17 16.8284 16.3284 17.5 15.5 17.5H4.5C3.67157 17.5 3 16.8284 3 16V4Z" stroke="currentColor" fill="none"/><path d="M11.5 2.5V8H17" stroke="currentColor" fill="none"/><path d="M7 11L9 13L7 15M12 11L10 13L12 15" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "check-square": {
    viewBox: "0 0 20 20",
    body: `<rect x="3" y="3" width="14" height="14" rx="1.5" stroke="currentColor" fill="none"/><path d="M6.5 10L9 12.5L13.5 8" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "folder-open": {
    viewBox: "0 0 20 20",
    body: `<path d="M3 6C3 5.17157 3.67157 4.5 4.5 4.5H7.5L9.5 6.5H15.5C16.3284 6.5 17 7.17157 17 8V14.5C17 15.3284 16.3284 16 15.5 16H4.5C3.67157 16 3 15.3284 3 14.5V6Z" stroke="currentColor" fill="none"/>`,
  },
  search: {
    viewBox: "0 0 20 20",
    body: `<circle cx="9.5" cy="9.5" r="5.5" stroke="currentColor" fill="none"/><path d="M14 14L18 18" stroke="currentColor" stroke-linecap="square"/>`,
  },
  bell: {
    viewBox: "0 0 20 20",
    body: `<path d="M10 3C12.5 3 14.5 5 14.5 7.5C14.5 10 15 12 16.5 13.5H3.5C5 12 5.5 10 5.5 7.5C5.5 5 7.5 3 10 3Z" stroke="currentColor" fill="none"/><path d="M8 15.5C8 16.5 9 17.5 10 17.5C11 17.5 12 16.5 12 15.5" stroke="currentColor"/>`,
  },
  home: {
    viewBox: "0 0 20 20",
    body: `<path d="M3 9L10 3L17 9V16C17 16.8284 16.3284 17.5 15.5 17.5H4.5C3.67157 17.5 3 16.8284 3 16V9Z" stroke="currentColor" fill="none"/><path d="M8 17.5V12H12V17.5" stroke="currentColor"/>`,
  },
  folder: {
    viewBox: "0 0 20 20",
    body: `<path d="M3 5.5C3 4.67157 3.67157 4 4.5 4H7L9 6H15.5C16.3284 6 17 6.67157 17 7.5V14.5C17 15.3284 16.3284 16 15.5 16H4.5C3.67157 16 3 15.3284 3 14.5V5.5Z" stroke="currentColor" fill="none"/>`,
  },
  "message-square": {
    viewBox: "0 0 20 20",
    body: `<rect x="3" y="3" width="14" height="12" rx="1.5" stroke="currentColor" fill="none"/><path d="M6.5 18L7.5 15.5H12.5L13.5 18" stroke="currentColor" fill="none"/>`,
  },
  send: {
    viewBox: "0 0 20 20",
    body: `<path d="M3 10L17 4L11 18L9 11L3 10Z" stroke="currentColor" fill="none"/>`,
  },
  map: {
    viewBox: "0 0 20 20",
    body: `<path d="M3 6L8 4L12 6L17 4V14L12 16L8 14L3 16V6Z" stroke="currentColor" fill="none"/><path d="M8 4V14M12 6V16" stroke="currentColor" fill="none"/>`,
  },
  layers: {
    viewBox: "0 0 20 20",
    body: `<path d="M10 3L17 7L10 11L3 7L10 3Z" stroke="currentColor" fill="none"/><path d="M3 12L10 16L17 12" stroke="currentColor" fill="none"/>`,
  },
  "rotate-ccw": {
    viewBox: "0 0 20 20",
    body: `<path d="M3.5 9C3.5 6 6 3.5 9 3.5C12 3.5 14.5 6 14.5 9" stroke="currentColor" fill="none"/><path d="M3.5 4.5V9H8" stroke="currentColor" stroke-linecap="square"/><path d="M14.5 11C14.5 14 12 16.5 9 16.5C6 16.5 3.5 14 3.5 11" stroke="currentColor" fill="none" opacity="0"/>`,
  },
  "refresh-cw": {
    viewBox: "0 0 20 20",
    body: `<path d="M3 10C3 6 6 3 10 3C13 3 15.5 4.5 16.5 7" stroke="currentColor" fill="none"/><path d="M17 3V7H13" stroke="currentColor" stroke-linecap="square"/><path d="M17 10C17 14 14 17 10 17C7 17 4.5 15.5 3.5 13" stroke="currentColor" fill="none"/><path d="M3 17V13H7" stroke="currentColor" stroke-linecap="square"/>`,
  },
  check: {
    viewBox: "0 0 20 20",
    body: `<path d="M4 10.5L8 14.5L16 6.5" stroke="currentColor" stroke-linecap="square"/>`,
  },
  x: {
    viewBox: "0 0 20 20",
    body: `<path d="M6 6L14 14M14 6L6 14" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "chevron-right": {
    viewBox: "0 0 20 20",
    body: `<path d="M8 6L12 10L8 14" stroke="currentColor" stroke-linecap="square"/>`,
  },
  pin: {
    viewBox: "0 0 20 20",
    body: `<path d="M10 3V11M10 11C10 11 7 14 5 16M10 11C10 11 13 14 15 16M7 6H13" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "more-horizontal": {
    viewBox: "0 0 20 20",
    body: `<circle cx="5" cy="10" r="1.5" fill="currentColor"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/>`,
  },
  "more-vertical": {
    viewBox: "0 0 20 20",
    body: `<circle cx="10" cy="5" r="1.5" fill="currentColor"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/><circle cx="10" cy="15" r="1.5" fill="currentColor"/>`,
  },
  filter: {
    viewBox: "0 0 20 20",
    body: `<path d="M3 5H17M6 10H14M9 15H11" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "arrow-up-down": {
    viewBox: "0 0 20 20",
    body: `<path d="M6 12L9 15L12 12M6 8L9 5L12 8" stroke="currentColor" stroke-linecap="square"/>`,
  },
  rocket: {
    viewBox: "0 0 20 20",
    body: `<path d="M10 2C12 4 14 7 14 11C14 13 13 15 12 16H8C7 15 6 13 6 11C6 7 8 4 10 2Z" stroke="currentColor" fill="none"/><path d="M5 13C4 14 3.5 15.5 3.5 17.5H6.5C6.5 16 6 14.5 5 13ZM15 13C16 14 16.5 15.5 16.5 17.5H13.5C13.5 16 14 14.5 15 13Z" stroke="currentColor" fill="none"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/>`,
  },
  database: {
    viewBox: "0 0 20 20",
    body: `<path d="M3 6C3 4.34315 6.13401 3 10 3C13.866 3 17 4.34315 17 6V14C17 15.6569 13.866 17 10 17C6.13401 17 3 15.6569 3 14V6Z" stroke="currentColor" fill="none"/><path d="M3 10C3 11.6569 6.13401 13 10 13C13.866 13 17 11.6569 17 10" stroke="currentColor" fill="none"/>`,
  },
  globe: {
    viewBox: "0 0 20 20",
    body: `<circle cx="10" cy="10" r="7" stroke="currentColor" fill="none"/><ellipse cx="10" cy="10" rx="3" ry="7" stroke="currentColor" fill="none"/><path d="M4 8H16M4 12H16" stroke="currentColor" fill="none"/>`,
  },
  "user-plus": {
    viewBox: "0 0 20 20",
    body: `<circle cx="9" cy="7" r="3" stroke="currentColor" fill="none"/><path d="M4 16C4 13.5 6 12 9 12C12 12 14 13.5 14 16" stroke="currentColor" fill="none"/><path d="M14 6H18M16 4V8" stroke="currentColor" stroke-linecap="square"/>`,
  },
  key: {
    viewBox: "0 0 20 20",
    body: `<circle cx="6.5" cy="13.5" r="3" stroke="currentColor" fill="none"/><path d="M9 11L14 6L16 8L18 6V3H15L13 5L15 7L10 12" stroke="currentColor" stroke-linecap="square"/>`,
  },
  lock: {
    viewBox: "0 0 20 20",
    body: `<rect x="5" y="8" width="10" height="8" rx="1" stroke="currentColor" fill="none"/><path d="M7 8V6C7 4.34315 8.34315 3 10 3C11.6569 3 13 4.34315 13 6V8" stroke="currentColor" fill="none"/>`,
  },
}

const spriteID = "opencode-v2-icon-sprite"
const symbol = (name: keyof typeof icons) => `opencode-v2-icon-${name}`
let spriteInserted = false

function ensureSprite() {
  if (spriteInserted) return
  if (typeof document === "undefined") return
  if (document.getElementById(spriteID)) {
    spriteInserted = true
    return
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.id = spriteID
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("width", "0")
  svg.setAttribute("height", "0")
  svg.style.position = "absolute"
  svg.style.overflow = "hidden"
  svg.innerHTML = Object.entries(icons)
    .map(
      ([name, icon]) =>
        `<symbol id="${symbol(name as keyof typeof icons)}" viewBox="${icon.viewBox}">${icon.body}</symbol>`,
    )
    .join("")
  document.body.insertBefore(svg, document.body.firstChild)
  spriteInserted = true
}

export interface IconProps extends ComponentProps<"svg"> {
  name: keyof typeof icons | (string & {})
  size?: "small" | "normal" | "large"
}

export function Icon(props: IconProps) {
  const [split, rest] = splitProps(props, ["name", "size"])
  const iconName = () => (icons[split.name as keyof typeof icons] ? (split.name as keyof typeof icons) : "plus")
  const icon = () => icons[iconName()]
  const pixelSize = split.size === "small" ? 14 : split.size === "large" ? 20 : 16
  onMount(ensureSprite)

  return (
    <svg
      {...rest}
      data-slot="icon-svg"
      width={pixelSize}
      height={pixelSize}
      viewBox={icon().viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={rest["aria-hidden"] ?? "true"}
    >
      <use href={`#${symbol(iconName())}`} />
    </svg>
  )
}
