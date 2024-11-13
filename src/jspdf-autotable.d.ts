declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface AutoTableOptions {
    // Define any options that you want to use here
    head?: Array<any[]>;
    body?: Array<any[]>;
    // Add more options as needed
  }

  function autoTable(doc: jsPDF, options: AutoTableOptions): void;

  export default autoTable;
}
