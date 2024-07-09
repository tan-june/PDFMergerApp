import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useDropzone } from 'react-dropzone';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown, faTrash } from '@fortawesome/free-solid-svg-icons';
import 'bootstrap/dist/css/bootstrap.min.css';

const ItemType = {
  PDF: 'pdf',
};

const PDFItem = ({ pdf, index, movePdf, handlePageNumbersChange, deletePdf, totalFiles }) => {
  const ref = React.useRef(null);
  const [, drop] = useDrop({
    accept: ItemType.PDF,
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      movePdf(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemType.PDF,
    item: { type: ItemType.PDF, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <tr ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <td>{pdf.name}</td>
      <td>{pdf.numPages}</td>
      <td>
        <input
          required
          type="text"
          className="form-control"
          placeholder="Enter page numbers or range (e.g., 1,2,3 or 1-3)"
          value={pdf.pages || ''}
          onChange={(e) => handlePageNumbersChange(index, e.target.value)}
        />
      </td>
      <td>
        <button onClick={() => movePdf(index, index - 1)} disabled={index === 0} className="btn btn-link">
          <FontAwesomeIcon icon={faArrowUp} />
        </button>
      </td>
      <td>
        <button onClick={() => movePdf(index, index + 1)} disabled={index === totalFiles - 1} className="btn btn-link">
          <FontAwesomeIcon icon={faArrowDown} />
        </button>
      </td>
      <td>
        <button onClick={() => deletePdf(index)} className="btn btn-link text-danger">
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </td>
    </tr>
  );
};

const PDFMerger = () => {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [pageNumbers, setPageNumbers] = useState({});
  const [mergedPdfUrl, setMergedPdfUrl] = useState(null);

  const onDrop = async (acceptedFiles) => {
    const newPdfs = await Promise.all(
      acceptedFiles.map(async (file) => {
        const pdfBytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(pdfBytes);
        return {
          file,
          name: file.name,
          pages: '',
          numPages: pdf.getPageCount(),
        };
      })
    );
    setPdfFiles([...pdfFiles, ...newPdfs]);
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: '.pdf', maxFiles: 5 });

  const movePdf = (fromIndex, toIndex) => {
    const updatedPdfs = Array.from(pdfFiles);
    const [movedPdf] = updatedPdfs.splice(fromIndex, 1);
    updatedPdfs.splice(toIndex, 0, movedPdf);
    setPdfFiles(updatedPdfs);
  };

  const deletePdf = (index) => {
    const updatedPdfs = Array.from(pdfFiles);
    updatedPdfs.splice(index, 1);
    setPdfFiles(updatedPdfs);
  };

  const handlePageNumbersChange = (index, pages) => {
    const updatedPages = { ...pageNumbers, [index]: pages };
    setPageNumbers(updatedPages);
  };

  const mergePdfs = async () => {
    const mergedPdf = await PDFDocument.create();
    for (let i = 0; i < pdfFiles.length; i++) {
      const pdfBytes = await pdfFiles[i].file.arrayBuffer();
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = pageNumbers[i]
        ? pageNumbers[i].split(',').flatMap(range => {
            if (range.includes('-')) {
              const [start, end] = range.split('-').map(num => parseInt(num, 10) - 1);
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

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container py-5">
        <div {...getRootProps({ className: 'border border-primary p-5 text-center mb-4' })}>
          <input {...getInputProps()} />
          <p className="text-muted">Drag 'n' drop some PDFs here, or click to select files</p>
        </div>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Name</th>
              <th># of Pages</th>
              <th>Pages</th>
              <th>Move Up</th>
              <th>Move Down</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {pdfFiles.map((pdf, index) => (
              <PDFItem
                key={index}
                pdf={pdf}
                index={index}
                movePdf={movePdf}
                handlePageNumbersChange={handlePageNumbersChange}
                deletePdf={deletePdf}
                totalFiles={pdfFiles.length}
              />
            ))}
          </tbody>
        </table>
        <center>
          <button onClick={mergePdfs} className="btn btn-primary" disabled={pdfFiles.length === 0}>Merge PDFs</button>
          {mergedPdfUrl && (
            <div className="mt-4">
              <a href={mergedPdfUrl} download="merged.pdf" className="btn btn-success">Download Merged PDF</a>
            </div>
          )}
        </center>
      </div>
    </DndProvider>
  );
};

const App = () => {
  const [showPDFMerger, setShowPDFMerger] = useState(false);

  const togglePDFMerger = () => {
    setShowPDFMerger(!showPDFMerger);
  };

  return (
    <div className="d-flex flex-column align-items-center min-vh-100 bg-light">
      <div className="container text-center py-5">
        <header className="bg-primary text-white p-4 rounded mb-3 shadow">
          <h1 className="display-4">PDF Merger</h1>
          <p className="lead">Merge your PDFs seamlessly!</p>
        </header>
        <button className="btn btn-outline-primary mb-4" onClick={togglePDFMerger}>
          {showPDFMerger ? 'Hide PDF Merger' : 'Show PDF Merger'}
        </button>
        {showPDFMerger && <PDFMerger />}
      </div>
      <footer className="mt-auto text-muted py-3">
        <p>&copy; 2024 Your Name. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
