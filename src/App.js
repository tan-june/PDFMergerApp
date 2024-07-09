import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useDropzone } from 'react-dropzone';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

const PDFMerger = () => {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [mergedPdfUrl, setMergedPdfUrl] = useState(null);

  const deletePdf = (index) => {
    const updatedPdfs = [...pdfFiles];
    updatedPdfs.splice(index, 1);
    setPdfFiles(updatedPdfs);
  };

  const handlePageNumbersChange = (index, pages) => {
    const updatedPdfs = [...pdfFiles];
    updatedPdfs[index].pages = pages;
    setPdfFiles(updatedPdfs);
  };

  const moveUp = (index) => {
    if (index >= 0) {
      const updatedPdfs = [...pdfFiles];
      const temp = updatedPdfs[index];
      updatedPdfs[index] = updatedPdfs[index - 1];
      updatedPdfs[index - 1] = temp;
      setPdfFiles(updatedPdfs);
    }
  };

  const moveDown = (index) => {
    if (index < pdfFiles.length - 1) {
      const updatedPdfs = [...pdfFiles];
      const temp = updatedPdfs[index];
      updatedPdfs[index] = updatedPdfs[index + 1];
      updatedPdfs[index + 1] = temp;
      setPdfFiles(updatedPdfs);
    }
  };

  const mergePdfs = async () => {
    const mergedPdf = await PDFDocument.create();
    for (let i = 0; i < pdfFiles.length; i++) {
      const pdfBytes = await pdfFiles[i].file.arrayBuffer();
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = pdfFiles[i].pages
        ? pdfFiles[i].pages.split(',').flatMap((range) => {
            if (range.includes('-')) {
              const [start, end] = range.split('-').map((num) => parseInt(num, 10) - 1);
              return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
            }
            return [parseInt(range, 10) - 1];
          })
        : Array.from({ length: pdf.getPageCount() }, (_, idx) => idx);
      const copiedPages = await mergedPdf.copyPages(pdf, pages);
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    const mergedPdfBytes = await mergedPdf.save();
    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setMergedPdfUrl(url);
  };

  const { getRootProps, getInputProps } = useDropzone({ accept: '.pdf', maxFiles: 5 });

  return (
    <div className="container py-5">
      <div {...getRootProps({ className: 'border border-primary p-5 text-center mb-4' })}>
        <input {...getInputProps()} className="form-control" />
        <p className="text-muted">Click to select files...</p>
      </div>
      <div className="table-responsive">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Name</th>
              <th># of Pages</th>
              <th>Pages</th>
              <th>Actions</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {pdfFiles.map((pdf, index) => (
              <tr key={index}>
                <td>{pdf.name}</td>
                <td>{pdf.numPages}</td>
                <td>
                  <input
                    required
                    type="text"
                    className="form-control"
                    placeholder="Enter page numbers or range (e.g., 1,2,3 or 1-3)"
                    value={pdf.pages}
                    onChange={(e) => handlePageNumbersChange(index, e.target.value)}
                  />
                </td>
                <td>
                  <div className="btn-group" role="group" aria-label="Move PDF">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                    >
                      <FontAwesomeIcon icon={faArrowUp} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => moveDown(index)}
                      disabled={index === pdfFiles.length - 1}
                    >
                      <FontAwesomeIcon icon={faArrowDown} />
                    </button>
                  </div>
                </td>
                <td>
                  <button onClick={() => deletePdf(index)} className="btn btn-link text-danger">
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <center>
        <button onClick={mergePdfs} className="btn btn-primary" disabled={pdfFiles.length === 0}>
          Merge PDFs
        </button>
        {mergedPdfUrl && (
          <div className="mt-4">
            <a href={mergedPdfUrl} download="merged.pdf" className="btn btn-success">
              Download Merged PDF
            </a>
          </div>
        )}
      </center>
    </div>
  );
};

const App = () => {
  return (
    <div className="d-flex flex-column align-items-center min-vh-100 bg-light">
      <div className="container text-center py-5">
        <header className="bg-primary text-white p-4 rounded mb-3 shadow">
          <h1 className="display-4">PDF Merger</h1>
          <p className="lead">Merge your PDFs seamlessly (without ads)!</p>
        </header>
        <PDFMerger />
      </div>
      <footer className="mt-auto text-muted py-3">
        <p>&copy; 2024 Tanmay Singhal. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
