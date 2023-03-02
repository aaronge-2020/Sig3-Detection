const userUpload = document.getElementById("fileInput");
var reader = new FileReader();
var debug = null;
var progressBar = null;
var predictionBar = null;
var progress = 0;
var mutSpec = {};
userData = null;
var mutationalSpectrumMatrix = null;
let processButtonDisabled = false;
let ten_NN_model = null;
let one_NN_model = null;


$("#uploadProgress").hide();
$("#loadingUMAP").hide();


async function train_NN_model(k) {
  const knn = fetch("https://raw.githubusercontent.com/aaronge-2020/Sig3-Detection/master/Data/MSK_Impact_train/BRCA_MSK_sigminer_wilcoxon_test_p_val_final.csv")
    .then(response => response.text())
    .then(csvText => {
      const lines = csvText.trim().split('\n');
      const header = lines.shift().split(',');
      const data = lines.map(line => line.split(','));
      const result = data.map(row => {
        const obj = {};
        header.forEach((key, i) => obj[key] = row[i]);
        return obj;
      });

      const X = result.map(array => Object.values(array).slice(0, 96).map(value => parseInt(value)));
      const y = result.map(array => Object.values(array).slice(100, 101).map(value => {
        if (value == "TRUE") {
          return 1
        } else {
          return 0
        }

      })[0]);

      const knn = new KNNClassifier(k);

      knn.train(X, y);

      return knn;
    });


  return await knn;
}
function initializeProgressBar() {
  $("#uploadProgress").prop("innerHTML", "");

  // Show the progress bar
  $("#uploadProgress").toggle();

  // Define the progress bar
  progressBar = new ProgressBar.SemiCircle(uploadProgress, {
    strokeWidth: 6,
    color: "#FFEA82",
    trailColor: "#eee",
    trailWidth: 1,
    easing: "easeInOut",
    duration: 1400,
    svgStyle: null,
    text: {
      value: "",
      alignToBottom: false,
    },
    from: { color: "#FFEA82" },
    to: { color: "#ED6A5A" },
    step: (state, progressBar) => {
      progressBar.path.setAttribute("stroke", state.color);
      var value = Math.round(progressBar.value() * 100);
      if (value === 0) {
        progressBar.setText("");
      } else {
        progressBar.setText(value);
      }

      progressBar.text.style.color = state.color;
    },
  });

  // Set the font family and size of the text that displays the progress bar's value.
  progressBar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
  progressBar.text.style.fontSize = "2rem";
}

async function loadNNModel(MODEL_URL) {
  const model = await tf.loadLayersModel(MODEL_URL);
  return model;
}

async function loadTrainData() {
  $("#loadUMAP").hide();

  const trainData = Papa.parse("./Data/training_data.csv", {
    header: true,
    download: true,
    dynamicTyping: true,
    complete: function (results) {
      UMAPProjections(results.data);
    },
  });
}
const arrayColumn = (arr, n) => arr.map((x) => x[n]);

async function UMAPProjections(data) {
  debug = data;
  $("#loadingUMAP").show();

  var transformed_data = [];
  is_sig3 = await d3.csv("./Data/is_sig3_20.csv");

  var sig3 = [];
  var not_sig3 = [];
  for (let i = 0; i < is_sig3.length; i++) {
    if (Object.values(is_sig3[i]) == "TRUE") {
      sig3.push(i);
    } else {
      not_sig3.push(i);
    }
  }

  const umap = new UMAP({
    nComponents: 3,
    nNeighbors: 15,
  });

  var layout = {
    autosize: true,
    showlegend: true,
    legend: {
      x: 1,
      xanchor: "right",
      y: 1,
    },
  };

  if (mutationalSpectrumMatrix != null) {
    data.push(mutationalSpectrumMatrix);

    const transformed = await umap.fitAsync(data, (epochNumber) => {
      // check progress and give user feedback, or return `false` to stop
    });

    var training_data_sig3 = {
      x: sig3.map((x) => arrayColumn(transformed.slice(0, -1), 0)[x]),
      y: sig3.map((x) => arrayColumn(transformed.slice(0, -1), 1)[x]),
      z: sig3.map((x) => arrayColumn(transformed.slice(0, -1), 2)[x]),
      mode: "markers",
      marker: {
        size: 6,
        color: "#ff0048",
        line: {
          color: "rgba(217, 217, 217, 0.14)",
          width: 0.5,
        },
        opacity: 0.8,
      },
      type: "scatter3d",
      name: "Sig3+",
    };

    var training_data_not_sig3 = {
      x: not_sig3.map((x) => arrayColumn(transformed.slice(0, -1), 0)[x]),
      y: not_sig3.map((x) => arrayColumn(transformed.slice(0, -1), 1)[x]),
      z: not_sig3.map((x) => arrayColumn(transformed.slice(0, -1), 2)[x]),
      mode: "markers",
      marker: {
        size: 6,
        color: "#0080ff",
        line: {
          color: "rgba(217, 217, 217, 0.14)",
          width: 0.5,
        },
        opacity: 0.8,
      },
      type: "scatter3d",
      name: "Sig3-",
    };

    var userData = {
      x: arrayColumn(transformed.slice(-1), 0),
      y: arrayColumn(transformed.slice(-1), 1),
      z: arrayColumn(transformed.slice(-1), 2),
      mode: "markers",
      marker: {
        color: "rgb(60, 250, 35)",
        size: 12,
        symbol: "circle",
        line: {
          color: "rgb(60, 250, 35)",
          width: 1,
        },
        opacity: 0.8,
      },
      type: "scatter3d",
      name: "Your Data",
    };
    transformed_data.push(training_data_sig3, training_data_not_sig3, userData);
  } else {
    const embedding = await umap.fitAsync(data, (epochNumber) => {
      // check progress and give user feedback, or return `false` to stop
    });

    var training_data_sig3 = {
      x: sig3.map((x) => arrayColumn(embedding, 0)[x]),
      y: sig3.map((x) => arrayColumn(embedding, 1)[x]),
      z: sig3.map((x) => arrayColumn(embedding, 2)[x]),
      mode: "markers",
      marker: {
        size: 6,
        color: "#ff0048",
        line: {
          color: "rgba(217, 217, 217, 0.14)",
          width: 0.5,
        },
        opacity: 0.8,
      },
      type: "scatter3d",
      name: "Sig3+",
    };

    var training_data_not_sig3 = {
      x: not_sig3.map((x) => arrayColumn(embedding, 0)[x]),
      y: not_sig3.map((x) => arrayColumn(embedding, 1)[x]),
      z: not_sig3.map((x) => arrayColumn(embedding, 2)[x]),
      mode: "markers",
      marker: {
        size: 6,
        color: "#0080ff",
        line: {
          color: "rgba(217, 217, 217, 0.14)",
          width: 0.5,
        },
        opacity: 0.8,
      },
      type: "scatter3d",
      name: "Sig3-",
    };
    transformed_data.push(training_data_not_sig3, training_data_sig3);
  }
  $("#loadingUMAP").hide();

  Plotly.newPlot("umapGraph", transformed_data, layout);
}

function getColor(data) {
  // Check whether the value of the "is_sig3_20" column is "FALSE".
  if (data.is_sig3_20 == "FALSE") {
    // If so, return the color "#0080ff".
    return "#0080ff";
  }
  // Otherwise, return the color "#ff0048".
  return "#ff0048";
}

function convert_mfa_to_mutational_spectrum(parsedData) {
  maf_file = d3.csvParse(parsedData);
}

// get_sbs_trinucleotide_contexts() returns a list of all possible
// single base substitution (SBS) trinucleotide contexts. It does this
// by iterating over all possible base_5, substitution, and base_3
// values and concatenating the strings together. The resulting list
// is returned.

function get_sbs_trinucleotide_contexts() {
  let sbs_trinucleotide_contexts = [];

  for (let base_5 of ["A", "C", "G", "T"]) {
    for (let substitution of ["C>A", "C>G", "C>T", "T>A", "T>C", "T>G"]) {
      for (let base_3 of ["A", "C", "G", "T"]) {
        sbs_trinucleotide_contexts.push(
          `${base_5}[${substitution}]${base_3}`
        );
      }
    }
  }

  return sbs_trinucleotide_contexts;
}


function standardize_substitution(ref_allele, mut_allele) {
  // Define the complementary sequence of the reference and mutated alleles.
  var complement_seq = {
    A: "T",
    C: "G",
    T: "A",
    G: "C",
  };
  // Define the purines in the reference and mutated alleles.
  var purines = ["A", "G"];

  // If the reference allele is a purine, then we infer the substituted
  // base in the complementary sequence, which would be from a pyrimidine
  // allele due to purines and pyrimidines complementing each other in a
  // double-stranded DNA.
  if (purines.some((v) => ref_allele.includes(v))) {
    return `${complement_seq[ref_allele]}>${complement_seq[mut_allele]}`;
  } else {
    return `${ref_allele}>${mut_allele}`;
  }
}

function init_sbs_mutational_spectra(n_records) {
  /*
    Initilizes an ordered dictionary with SBS trinucleotide context as keys and
    a list of counts, one for each sample.
    :param n_records: number of samples to record in the mutational spectra matrix.
    :return: a dictionary of trinucleotide context and a list of counts
    initialized to zeros.
    */

  tri_nuc_context = get_sbs_trinucleotide_contexts();

  sbs_mutational_spectra = {};

  for (var i = 0; i < tri_nuc_context.length; i++) {
    context = tri_nuc_context[i];
    sbs_mutational_spectra[context] = 0;
  }

  return sbs_mutational_spectra;
}

function standardize_trinucleotide(trinucleotide_ref) {
  // DNA sequences are made up of two strands, known as the forward strand and
  // the reverse complement strand. For a given nucleotide sequence, the
  // reverse complement sequence is the reverse of the sequence, with each
  // nucleotide replaced by its complement (A replaced by T, T replaced by A,
  // C replaced by G, G replaced by C).

  // COSMIC signatures define mutations from a pyrimidine allele (C, T) to any
  // other base (C>A, C>G, C>T, T>A, T>C, T>G). If a mutation in the MAF file
  // is defined from a purine allele (A, G), then we infer the trinucleotide
  // context in the complementary sequence, which would be from a pyrimidine
  // allele due to purines and pyrimidines complementing each other in a
  // double-stranded DNA.

  // :param trinucleotide_ref: trinucleotide sequence seen in the reference genome.
  // :return: a pyrimidine-centric trinucleotide sequence.

  complement_seq = {
    A: "T",
    C: "G",
    T: "A",
    G: "C",
  };
  purines = "AG";

  // If the middle nucleotide is a purine, then the middle nucleotide in the
  // complementary sequence is a pyrimidine. Thus, we can infer the
  // complementary sequence.
  if (purines.includes(trinucleotide_ref[1])) {
    return `${complement_seq[trinucleotide_ref[2]]}${complement_seq[trinucleotide_ref[1]]
      }${complement_seq[trinucleotide_ref[0]]}`;
  } else {
    return trinucleotide_ref;
  }
}

function loadFile() {
  let URLPassed = $("#fileURL").val();
  let URLExtension = get_url_extension(URLPassed);
  if (URLPassed != "") {
    if (URLExtension == "maf") {
      parseMAFFromURL(URLPassed);
    } else if (URLExtension == "csv") {
      parseMutSpecFromURL(URLPassed);
    } else {
      fireErrorMessage(
        "File type must be .maf for MAF files or .csv for mutational spectra!"
      );
      return;
    }
  } else {
    loadLocalFile();
  }
}

function loadLocalFile() {
  const file = userUpload.files[0];
  if (typeof file == "undefined" && userData == null) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No File Selected!",
      confirmButtonColor: "#2098ce",
    });
    fireErrorMessage("No File Selected!");
    return;
  }

  if (typeof file == "undefined") {
    var url = document.getElementById("fileURL");
    var fileType = url.value.substring(url.value.lastIndexOf(".") + 1);
  } else {
    fileName = file.name;
    var fileType = fileName.substring(fileName.lastIndexOf(".") + 1);
  }

  if (fileType == "csv") {
    reader.addEventListener("load", parseCSV, false);
    if (file) {
      reader.readAsText(file);
    }
  } else if (fileType == "maf") {
    reader.addEventListener("load", parseMAF, false);
    if (file) {
      reader.readAsText(file);
    }
  } else {
    fireErrorMessage("File type must be .maf for MAF files or .csv for mutational spectra!"
    );
    return;
  }

  if (userData != null && fileType == "maf") {
    if (userData.columns[0] == "404: Not Found") {
      fireErrorMessage("Invalid URL!");
      return;
    }
    convertMatrix(userData);
  }
}

function setProcessFileButtonSuccess() {
  var fileButton = $("#processFile");

  if (!processButtonDisabled) {
    $("#processFile").prop("disabled", true);
    $("#processFile").prop("innerHTML", "Success");

    if (fileButton.hasClass("btn-primary")) {
      $("#processFile").removeClass("btn-primary");
    }

    if (fileButton.hasClass("btn-secondary")) {
      $("#processFile").removeClass("btn-secondary");
    }
    $("#processFile").addClass("btn-success");
    processButtonDisabled = true;
  }
  $("#successGIF").toggle();

  setTimeout(function () {
    $("#successGIF").toggle("fast");
  }, 2000);
}

function reactivateProcessFileButton() {
  var fileButton = $("#processFile");

  if (processButtonDisabled) {
    $("#processFile").prop("disabled", false);
    $("#processFile").prop("innerHTML", "Process");

    if (fileButton.hasClass("btn-success")) {
      $("#processFile").removeClass("btn-success");
    }
    if (fileButton.hasClass("btn-secondary")) {
      $("#processFile").removeClass("btn-secondary");
    }
    $("#processFile").addClass("btn-primary");
    processButtonDisabled = false;
  }
}
function parseCSV() {
  var data = d3.csvParse(reader.result);

  userData = data;
  mutationalSpectrumMatrix = userData[0];
  Object.keys(mutationalSpectrumMatrix).map(function (key, index) {
    mutationalSpectrumMatrix[key] = parseInt(mutationalSpectrumMatrix[key]);
  });

  setProcessFileButtonSuccess();
}

function parseMAF() {
  // parse the data from the reader
  var data = d3.tsvParse(reader.result);
  userData = data;
  convertMatrix(userData);
}
function isValidHttpUrl(string) {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

async function getDataFromURL(URL) {
  const response = await fetch(URL, {
    method: "GET",
  })
    .then((response) => response.text())
    .catch((error) => {
      fireErrorMessage("Invalid URL");
      console.error(error);
    });
  return response;
}

function fireErrorMessage(message) {
  Swal.fire({
    icon: "error",
    title: "Error",
    text: message,
    confirmButtonColor: "#2098ce",
  });
}

function parseMAFFromURL(URL) {
  if (isValidHttpUrl(URL)) {
    getDataFromURL(URL).then((data) => {
      if (data == null) {
        return;
      }
      data = d3.tsvParse(data);
      userData = data;
      convertMatrix(userData);
    });
  } else {
    fireErrorMessage("Invalid URL");
  }
}

// parseMutSpecFromURL() is called when the user clicks on the "Process File" button
async function parseMutSpecFromURL(URL) {
  if (isValidHttpUrl(URL)) {
    // getDataFromURL() is an asynchronous function that returns a promise, which we await
    var data = await getDataFromURL(URL);
    if (data == null) {
      return;
    }

    // d3.csvParse() parses a CSV file into a JavaScript object
    data = d3.csvParse(data);
    userData = data;
    mutationalSpectrumMatrix = userData[0];
    Object.keys(mutationalSpectrumMatrix).map(function (key, index) {
      mutationalSpectrumMatrix[key] = parseInt(mutationalSpectrumMatrix[key]);
    });
  } else {
    console.log("Invalid URL");
  }
  setProcessFileButtonSuccess();
}

async function convertMatrix(data) {
  var elem = document.getElementById("myBar");

  var mutationalSpectrum = init_sbs_mutational_spectra();
  initializeProgressBar();
  moveProgressBar();

  for (let i = 0; i < data.length; i++) {
    var chromosomeNumber = data[i]["Chromosome"];
    var referenceAllele = data[i]["Reference_Allele"];
    var mutatedTo = data[i]["Tumor_Seq_Allele2"];
    // Start Position is the same as end position, since these are SBS mutations
    var position = data[i]["Start_Position"];
    var variantType = data[i]["Variant_Type"];

    try {
      var sequence = await getMutationalContext(
        chromosomeNumber,
        parseInt(position)
      );
      sequence = standardize_trinucleotide(sequence);
      fivePrime = sequence[0];
      threePrime = sequence[2];
      mutationType = String(
        `${fivePrime}[${standardize_substitution(
          referenceAllele,
          mutatedTo
        )}]${threePrime}`
      ).toUpperCase();


      if (
        (variantType == "SNP" || variantType == "single base substitution") &&
        !mutationType.includes("N") &&
        !mutationType.includes("U")
      ) {
        mutationalSpectrum[mutationType] =
          Number(mutationalSpectrum[mutationType]) + Number(1);

        progress = (i + 1) / data.length;

        if (progress > 0.95) {
          progress = 1;
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
  mutationalSpectrumMatrix = mutationalSpectrum;
}
async function getMutationalContext(chromosomeNumber, startPosition) {
  const chrName = String(chromosomeNumber);
  const startByte = startPosition - 2;
  const endByte = startPosition;

  const msg = await (
    await fetch(
      // This is the URL for the sequence.bin file
      `https://storage.googleapis.com/storage/v1/b/chaos-game-representation-grch37/o/chr${chrName}%2Fsequence.bin?alt=media`,
      {
        headers: {
          "Content-Type": "application/octet-stream",
          Range: `bytes=${startByte}-${endByte}`,
        },
      }
    )
  ).arrayBuffer();
  const view = new DataView(msg);

  let seq = "";
  for (let i = 0; i < view.byteLength; i++) {
    seq += String.fromCharCode(view.getUint8(i));
  }

  return seq;
}
function get_url_extension(url) {
  return url
    .split(/[#?]/)[0] // remove everything from the first # or ? character
    .split(".") // split the string by "." characters
    .pop() // return the last item in the array
    .trim(); // remove whitespace from the beginning and end of the string
}

// create a function to move the progress bar
function moveProgressBar() {
  // create an interval
  var id = setInterval(frame, 1000);
  function frame() {
    // if the progress has reached 1.0, finish the progress bar
    if (progress == 1.0) {
      progressBar.animate(progress);
      clearInterval(id);
      setTimeout(function () {
        setProcessFileButtonSuccess();

        fadeAndDestroyDiv($("#uploadProgress"));
        // $("#uploadProgress").hide();
      }, 2000);
    } else {
      // otherwise, progress the progress bar
      progressBar.animate(progress);
    }
  }
}

class KNNClassifier {
  constructor(k) {
    this.k = k;
    this.X = null;
    this.y = null;
  }

  train(X, y) {
    this.X = X;
    this.y = y;
  }

  predict(X) {
    const predictions = [];

    for (let i = 0; i < X.length; i++) {
      const distances = [];

      // Calculate distances from the current data point to all training examples
      for (let j = 0; j < this.X.length; j++) {
        const distance = this.calculateDistance(X[i], this.X[j]);
        distances.push([distance, this.y[j]]);
      }

      // Sort the distances in ascending order
      distances.sort((a, b) => a[0] - b[0]);

      // Take the first k elements and count the number of occurrences of each class
      const classCounts = {};
      for (let j = 0; j < this.k; j++) {
        const label = distances[j][1];
        classCounts[label] = classCounts[label] ? classCounts[label] + 1 : 1;
      }

      // Find the class with the highest count
      let maxCount = 0;
      let predictedClass = null;
      for (const label in classCounts) {
        if (classCounts[label] > maxCount) {
          maxCount = classCounts[label];
          predictedClass = label;
        }
      }

      // Store the predicted class
      if (0 in classCounts && 1 in classCounts) {
        predictions.push(classCounts[1] / this.k)
      } else {
        predictions.push(predictedClass)
      }

      return predictions;
    }
  }

  calculateDistance(x1, x2) {
    let sumSquared = 0;

    for (let i = 0; i < x1.length; i++) {
      const diff = x1[i] - x2[i];
      sumSquared += diff * diff;
    }

    return Math.sqrt(sumSquared);
  }
}



function fadeAndDestroyDiv(div) {
  div.css("transition", "opacity 1.25s");
  div.css("transition-timing-function", "ease-out");

  div.css("opacity", "0");

  $("#uploadProgress").slideToggle("slow");
  setTimeout(function () {
    progressBar.destroy();
    div.css("opacity", "1");
  }, 2000);
}

function formatMatrixForPredictionNN(matrix) {
  // If the input is a dictionary, convert it to an array
  matrix = Object.values(matrix);
  // If the input is a 2D array, reshape it to a 3D array
  if (typeof matrix[0].length != "undefined") {
    data = tf.reshape(matrix, [matrix.length, 96]);
  } else {
    // If the input is a 1D array, reshape it to a 3D array
    data = tf.reshape(matrix, [1, 96, 1]);
  }

  return data;
}
function formatMatrixForPredictionXGB(matrix) {
  // Create a copy of the input dictionary
  data = structuredClone(matrix);
  // Add a key "unknown" and assign it the value NaN. This is required by the XGBoost model, since it expects a dictionary with 97 keys
  data["unknown"] = NaN;
  // Loop through the keys of the original dictionary
  for (let key in data) {
    // Convert the value of each key into an array and assign it to the corresponding key in the new dictionary
    data[key] = [data[key]];
  }

  return data;
}

async function generatePredictions() {
  Object.assign(mutSpec, mutationalSpectrumMatrix);
  for (key in mutSpec) {
    mutSpec[key.replace(/[^a-zA-Z ]/g, "").toUpperCase()] = mutSpec[key];
    delete mutSpec[key];
  }

  if (mutationalSpectrumMatrix == null) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No File Has Been Processed!",
      confirmButtonColor: "#2098ce",
    });
    return;
  }

  var data = mutSpec;

  var type = document.getElementById("modelSelection");
  var modelType = type.value;

  var predicted_prob = 1;

  if (modelType == "1") {

    const SIGMOID_model = "./js/Models/ANN_Sigmoid/model.json";

    console.log("Sigmoid ANN model");

    data = formatMatrixForPredictionNN(mutSpec);

    NN = await loadNNModel(SIGMOID_model);

    predicted_prob = NN.predict(data).arraySync()[0][0];

  } else if (modelType == "2") {
    data = formatMatrixForPredictionXGB(mutSpec);
    let model = await ydf.loadModelFromUrl("./js/Models/XGBoost/model.zip");
    predicted_prob = model.predict(data);
  } else if (modelType == "3") {
    console.log("Nearest Neighbor model");
    data = Object.values(mutationalSpectrumMatrix).map((value) => parseInt(value));
    predicted_prob = one_NN_model.predict([data])[0];
  } else if (modelType == "4") {
    console.log("10-Nearest Neighbors model");
    data = Object.values(mutationalSpectrumMatrix).map((value) => parseInt(value));
    predicted_prob = ten_NN_model.predict([data])[0];
  }
  else if (modelType == "5") {
    console.log("LR model");
    data = Object.values(mutationalSpectrumMatrix);
    data = new ML.Matrix([data]);
    var json = await $.getJSON("./js/Models/LR.json");
    LR_model = mlLogisticRegression.load(json);
    predicted_prob = LR_model.classifiers[0].testScores(data)[0];
  } else {
    fireErrorMessage("No Model Selected!");
    return;
  }

  if (predicted_prob < 0) {
    predicted_prob = 0;
  } else if (predicted_prob > 1) {
    predicted_prob = 1;
  }

  if (predictionBar != null) {
    predictionBar.destroy();
  }

  var bar = new ProgressBar.Circle(results, {
    color: "#C70039",
    // This has to be the same size as the maximum width to
    // prevent clipping
    strokeWidth: 4,
    trailWidth: 1,
    easing: "easeInOut",
    duration: 1400,
    text: {
      autoStyleContainer: true,
    },
    from: { color: "#DAF7A6", width: 1 },
    to: { color: "#C70039", width: 3 },
    // Set default step function for all animate calls
    step: function (state, circle) {
      circle.path.setAttribute("stroke", state.color);
      circle.path.setAttribute("stroke-width", state.width);

      var value = Math.round(circle.value() * 100);
      if (value === 0) {
        circle.setText(value + "%");
      } else {
        circle.setText(value + "%");
      }
    },
  });
  bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
  bar.text.style.fontSize = "2rem";

  predictionBar = bar;

  console.log(predicted_prob);

  let textValue = parseFloat(predicted_prob).toFixed(7);

  var app = document.getElementById("actualOutput");

  var typewriter = new Typewriter(app, {
    loop: false,
  });

  typewriter.typeString(textValue).start();

  predictionBar.animate(predicted_prob); // Number from 0.0 to 1.0

  if ($("#resultsSection").is(":hidden")) {
    $("#resultsSection").slideToggle(1000);
  }
}

window.onload = async function () {
  ten_NN_model = await train_NN_model(10);
  one_NN_model = await train_NN_model(1);
};
