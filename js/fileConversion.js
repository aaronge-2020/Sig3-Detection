const userUpload = document.getElementById("fileInput");
var reader = new FileReader();
const MODEL_URL = "./js/Models/NN/model.json";
var debug = null;
var progressBar = null;
var predictionBar = null;
var progress = 0;
var mutSpec = {};
userData = null;
var mutationalSpectrumMatrix = null;

$('#uploadProgress').hide();
$('#loadingUMAP').hide();
$('#results_text').hide();



function initializeProgressBar() {

    $('#uploadProgress').slideDown("slow");
    // $('#uploadProgress').append("<br> <br>");
    var bar = new ProgressBar.SemiCircle(uploadProgress, {
        strokeWidth: 6,
        color: '#FFEA82',
        trailColor: '#eee',
        trailWidth: 1,
        easing: 'easeInOut',
        duration: 1400,
        svgStyle: null,
        text: {
            value: '',
            alignToBottom: false
        },
        from: { color: '#FFEA82' },
        to: { color: '#ED6A5A' },
        // Set default step function for all animate calls
        step: (state, bar) => {
            bar.path.setAttribute('stroke', state.color);
            var value = Math.round(bar.value() * 100);
            if (value === 0) {
                bar.setText('');
            } else {
                bar.setText(value);
            }

            bar.text.style.color = state.color;
        }
    });
    bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
    bar.text.style.fontSize = '2rem';

    progressBar = bar;


}

async function loadNNModel() {
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
            UMAPProjections(results.data)
        }
    });
}
const arrayColumn = (arr, n) => arr.map(x => x[n]);

async function UMAPProjections(data) {

    debug = data;
    $('#loadingUMAP').show();


    var transformed_data = [];
    is_sig3 = await d3.csv("./Data/is_sig3_20.csv");

    var sig3 = []
    var not_sig3 = []
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
        'autosize': true,
        showlegend: true,
        legend: {
            x: 1,
            xanchor: 'right',
            y: 1
        }
    };

    if (mutationalSpectrumMatrix != null) {

        data.push(mutationalSpectrumMatrix);

        const transformed = await umap.fitAsync(data, epochNumber => {
            // check progress and give user feedback, or return `false` to stop
        });


        var training_data_sig3 = {
            x: sig3.map(x => arrayColumn(transformed.slice(0, -1), 0)[x]),
            y: sig3.map(x => arrayColumn(transformed.slice(0, -1), 1)[x]),
            z: sig3.map(x => arrayColumn(transformed.slice(0, -1), 2)[x]),
            mode: 'markers',
            marker: {
                size: 6,
                color: "#ff0048",
                line: {
                    color: 'rgba(217, 217, 217, 0.14)',
                    width: 0.5
                },
                opacity: 0.8
            },
            type: 'scatter3d',
            name: 'Sig3+'
        };

        var training_data_not_sig3 = {
            x: not_sig3.map(x => arrayColumn(transformed.slice(0, -1), 0)[x]),
            y: not_sig3.map(x => arrayColumn(transformed.slice(0, -1), 1)[x]),
            z: not_sig3.map(x => arrayColumn(transformed.slice(0, -1), 2)[x]),
            mode: 'markers',
            marker: {
                size: 6,
                color: "#0080ff",
                line: {
                    color: 'rgba(217, 217, 217, 0.14)',
                    width: 0.5
                },
                opacity: 0.8
            },
            type: 'scatter3d',
            name: 'Sig3-'
        };

        var userData = {
            x: arrayColumn(transformed.slice(-1), 0),
            y: arrayColumn(transformed.slice(-1), 1),
            z: arrayColumn(transformed.slice(-1), 2),
            mode: 'markers',
            marker: {
                color: 'rgb(60, 250, 35)',
                size: 12,
                symbol: 'circle',
                line: {
                    color: 'rgb(60, 250, 35)',
                    width: 1
                },
                opacity: 0.8
            },
            type: 'scatter3d',
            name: 'Your Data'

        };
        transformed_data.push(training_data_sig3, training_data_not_sig3, userData);

    } else {
        const embedding = await umap.fitAsync(data, epochNumber => {
            // check progress and give user feedback, or return `false` to stop
        });

        var training_data_sig3 = {
            x: sig3.map(x => arrayColumn(embedding, 0)[x]),
            y: sig3.map(x => arrayColumn(embedding, 1)[x]),
            z: sig3.map(x => arrayColumn(embedding, 2)[x]),
            mode: 'markers',
            marker: {
                size: 6,
                color: '#ff0048',
                line: {
                    color: 'rgba(217, 217, 217, 0.14)',
                    width: 0.5
                },
                opacity: 0.8
            },
            type: 'scatter3d',
            name: 'Sig3+'
        };

        var training_data_not_sig3 = {
            x: not_sig3.map(x => arrayColumn(embedding, 0)[x]),
            y: not_sig3.map(x => arrayColumn(embedding, 1)[x]),
            z: not_sig3.map(x => arrayColumn(embedding, 2)[x]),
            mode: 'markers',
            marker: {
                size: 6,
                color: "#0080ff",
                line: {
                    color: 'rgba(217, 217, 217, 0.14)',
                    width: 0.5
                },
                opacity: 0.8
            },
            type: 'scatter3d',
            name: 'Sig3-'
        };
        transformed_data.push(training_data_not_sig3, training_data_sig3);
    }
    $('#loadingUMAP').hide();

    Plotly.newPlot('umapGraph', transformed_data, layout);

}


function getColor(data) {
    // enter your conditional coloring code here
    if (data.is_sig3_20 == "FALSE") {
        return '#0080ff'
    }
    return '#ff0048';
}


function convert_mfa_to_mutational_spectrum(parsedData) {

    maf_file = d3.csvParse(parsedData);
    console.log(maf_file);
}
function get_sbs_trinucleotide_contexts() {
    /*
    Returns a list of trinucleotide context for single base substitutions (SBS)
    for constructing a COSMIC mutational spectra matrix.
     :return: a list of SBS trinucleotide contexts.
    */
    var nucleotide_bases, sbs_trinucleotide_contexts, substitution_types;
    sbs_trinucleotide_contexts = new Array();
    nucleotide_bases = ["A", "C", "G", "T"];
    substitution_types = ["C>A", "C>G", "C>T", "T>A", "T>C", "T>G"];

    for (var base_5, _pj_c = 0, _pj_a = nucleotide_bases, _pj_b = _pj_a.length; _pj_c < _pj_b; _pj_c += 1) {
        base_5 = _pj_a[_pj_c];

        for (var substitution, _pj_f = 0, _pj_d = substitution_types, _pj_e = _pj_d.length; _pj_f < _pj_e; _pj_f += 1) {
            substitution = _pj_d[_pj_f];

            for (var base_3, _pj_i = 0, _pj_g = nucleotide_bases, _pj_h = _pj_g.length; _pj_i < _pj_h; _pj_i += 1) {
                base_3 = _pj_g[_pj_i];
                sbs_trinucleotide_contexts.push(`${base_5}[${substitution}]${base_3}`);
            }
        }
    }

    return sbs_trinucleotide_contexts;
}


function standardize_substitution(ref_allele, mut_allele) {
    /*
    COSMIC signatures define mutations from a pyrimidine allele (C, T) to any
    other base (C>A, C>G, C>T, T>A, T>C, T>G). If a mutation in the MAF file
    is defined from a reference purine allele (A, G), then we infer the substituted
    base in the complementary sequence, which would be from a pyrimidine
    allele due to purines and pyrimidines complementing each other in a
    double-stranded DNA.
     :param ref_allele: base in the reference genome.
    :param mut_allele: base in the mutated genome
    :return: substitution string from pyrimidine to any other base.
    */
    var complement_seq, purines;
    complement_seq = {
        "A": "T",
        "C": "G",
        "T": "A",
        "G": "C"
    };
    purines = ["A", "G"];

    if (purines.some(v => ref_allele.includes(v))) {
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

    // COSMIC signatures define mutations from a pyrimidine allele (C, T) to any
    // other base (C>A, C>G, C>T, T>A, T>C, T>G). If a mutation in the MAF file
    // is defined from a purine allele (A, G), then we infer the trinucleotide
    // context in the complementary sequence, which would be from a pyrimidine
    // allele due to purines and pyrimidines complementing each other in a
    // double-stranded DNA.

    // :param trinucleotide_ref: trinucleotide sequence seen in the reference genome.
    // :return: a pyrimidine-centric trinucleotide sequence.

    complement_seq = {
        'A': 'T',
        'C': 'G',
        'T': 'A',
        'G': 'C'
    }
    purines = "AG"
    if (purines.includes(trinucleotide_ref[1])) {
        return `${complement_seq[trinucleotide_ref[2]]}${complement_seq[trinucleotide_ref[1]]}${complement_seq[trinucleotide_ref[0]]}`
    }
    else {
        return trinucleotide_ref
    }
}

function loadFile() {
    const file = userUpload.files[0];
    if ((typeof file == 'undefined' && userData == null)) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No File Selected!',
            confirmButtonColor: '#2098ce',
        });
        return;
    }

    if (typeof file == 'undefined') {
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
        Swal.fire({
            icon: 'success',
            title: 'Matrix Uploaded',
            showConfirmButton: true,
            confirmButtonColor: '#2098ce',
    
        });
        
    } else if (fileType == "maf") {
        reader.addEventListener("load", parseMAF, false);
        if (file) {
            reader.readAsText(file);
        }
    } else {

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No File Type Selected!',
            confirmButtonColor: '#2098ce',
        })
        return;
    }

    if (userData != null && fileType == "maf") {

        if (userData.columns[0] == "404: Not Found") {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Invalid URL!',
                confirmButtonColor: '#2098ce',
            })
            return;
        }
        convertMatrix(userData);
    }


}

function parseCSV() {
    var data = d3.csvParse(reader.result);

    userData = data;
    mutationalSpectrumMatrix = userData[0]
    Object.keys(mutationalSpectrumMatrix).map(function (key, index) {
        mutationalSpectrumMatrix[key] = parseInt(mutationalSpectrumMatrix[key]);
    });

    Swal.fire({
        icon: 'success',
        title: 'Matrix Uploaded',
        showConfirmButton: true,
        confirmButtonColor: '#2098ce',

    });

}

function parseMAF() {
    console.log(reader.result);
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

function getDataFromURL(URL) {
    return fetch(URL,
        {
            method: "GET",
        })
        .then((response) => response.text())
        .then((responseData) => {
            return responseData;
        })
        .catch(error => console.warn(error));
}

async function parseMAFFromURL(URL) {
    if (isValidHttpUrl(URL)) {
        var data = await getDataFromURL(URL)
        console.log(data);
        data = d3.tsvParse(data);
        userData = data;
    } else {
        console.log("Invalid URL");
    }
    console.log("onchange called");
}

async function parseMutSpecFromURL(URL) {
    if (isValidHttpUrl(URL)) {
        var data = await getDataFromURL(URL)
        console.log(data);
        data = d3.csvParse(data);
        userData = data;
        mutationalSpectrumMatrix = userData[0]
        Object.keys(mutationalSpectrumMatrix).map(function (key, index) {
            mutationalSpectrumMatrix[key] = parseInt(mutationalSpectrumMatrix[key]);
        });
    } else {
        console.log("Invalid URL");
    }
}


async function convertMatrix(data) {
    var elem = document.getElementById("myBar");


    var mutationalSpectrum = init_sbs_mutational_spectra();
    initializeProgressBar();
    moveProgressBar();

    for (let i = 0; i < data.length; i++) {
        var chromosomeNumber = data[i]['Chromosome'];
        var referenceAllele = data[i]['Reference_Allele'];
        var mutatedTo = data[i]['Tumor_Seq_Allele2'];
        // Start Position is the same as end position, since these are SBS mutations
        var position = data[i]["Start_Position"];
        var variantType = data[i]["Variant_Type"];

        try {
            var sequence = await getMutationalContext(chromosomeNumber, parseInt(position));
            sequence = standardize_trinucleotide(sequence);
            fivePrime = sequence[0];
            threePrime = sequence[2];
            mutationType = String(`${fivePrime}[${standardize_substitution(referenceAllele, mutatedTo)}]${threePrime}`).toUpperCase()

            console.log(mutationType, position);

            if ((variantType == "SNP" || variantType == "single base substitution") && !mutationType.includes("N") && !mutationType.includes("U")) {
                mutationalSpectrum[mutationType] = Number(mutationalSpectrum[mutationType]) + Number(1);

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

    const msg = await (await fetch(`https://storage.googleapis.com/storage/v1/b/chaos-game-representation-grch37/o/chr${chrName}%2Fsequence.bin?alt=media`, {
        headers: {
            "Content-Type": "application/octet-stream",
            "Range": `bytes=${startByte}-${endByte}`
        }
    })).arrayBuffer();
    const view = new DataView(msg);

    let seq = ""
    for (let i = 0; i < view.byteLength; i++) {
        seq += String.fromCharCode(view.getUint8(i));
    }

    return seq;

}

function moveProgressBar() {

    var id = setInterval(frame, 1000);
    function frame() {
        if (progress == 1.0) {
            progressBar.animate(progress);
            clearInterval(id);
            setTimeout(function () {
                Swal.fire({
                    icon: 'success',
                    title: 'MAF Processing Complete',
                    showConfirmButton: true,
                    confirmButtonColor: '#2098ce',

                })

                $('#uploadProgress').hide();
                progressBar.destroy();
            }, 2000);


        } else {
            console.log(progress);
            progressBar.animate(progress);
        }
    }
}


function formatMatrixForPrediction(matrix) {

    matrix = Object.values(matrix);
    if (typeof (matrix[0].length) != "undefined") {
        data = tf.reshape(matrix, [matrix.length, 96, 1])

    } else {
        data = tf.reshape(matrix, [1, 96, 1])
    }

    return data;
}

function scaleXGBoostPredictions(x, min, max) {

    score = (x - min) / (max - min)
    return score;
}

async function generatePredictions() {


    Object.assign(mutSpec, mutationalSpectrumMatrix);
    for (key in mutSpec) {
        mutSpec[key.replace(/[^a-zA-Z ]/g, "")] = mutSpec[key];
        delete mutSpec[key];
    }

    if (mutationalSpectrumMatrix == null) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No File Has Been Processed!',
            confirmButtonColor: '#2098ce',
        })
        return;
    }


    var data = mutSpec;

    var type = document.getElementById("modelSelection");
    var modelType = type.value;


    var predicted_prob = 1;

    $('#results_text').show();

    if (modelType == "1") {
        console.log("neural network model");

        data = formatMatrixForPrediction(mutSpec);

        NN = await loadNNModel();

        predicted_prob = NN.predict(data).arraySync()[0][0];

    } else if (modelType == "2") {

        console.log("xgboost model");
        var json = await $.getJSON("./js/xgboost-scorer/xgb.model.json");
        const scorer = await Scorer.create(json);

        predicted_prob = await scorer.score(data);
        predicted_prob = scaleXGBoostPredictions(predicted_prob, 0.4999981, 0.5000019);

    } else if (modelType == "3") {
        console.log("KNN model");
        data = Object.values(mutSpec);
        var json_knn = await d3.json("./js/Models/knn_algorithm.json");
        var knn_load = ML.KNN.load(json_knn);
        predicted_prob = knn_load.predict(data);

    } else if (modelType == "4") {
        console.log("LR model");
        data = Object.values(mutSpec);
        data = new ML.Matrix([data])
        var json = await $.getJSON("./js/Models/LR.json");
        LR_model = mlLogisticRegression.load(json);
        predicted_prob = LR_model.classifiers[0].testScores(data)[0];
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No Model Selected!',
            confirmButtonColor: '#2098ce',
        });
        return;
    }

    Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Prediction Complete!',
        confirmButtonColor: '#2098ce',
    })
    if (predicted_prob < 0) {
        predicted_prob = 0;
    } else if (predicted_prob > 1) {
        predicted_prob = 1;
    }

    if (predictionBar != null) {
        predictionBar.destroy();
    }
    var bar = new ProgressBar.Circle(results, {
        color: '#C70039',
        // This has to be the same size as the maximum width to
        // prevent clipping
        strokeWidth: 4,
        trailWidth: 1,
        easing: 'easeInOut',
        duration: 1400,
        text: {
            autoStyleContainer: true
        },
        from: { color: '#DAF7A6', width: 1 },
        to: { color: '#C70039', width: 3 },
        // Set default step function for all animate calls
        step: function (state, circle) {
            circle.path.setAttribute('stroke', state.color);
            circle.path.setAttribute('stroke-width', state.width);

            var value = Math.round(circle.value() * 100);
            if (value === 0) {
                circle.setText(value + "%");
            } else {
                circle.setText(value + "%");
            }

        }
    });
    bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
    bar.text.style.fontSize = '2rem';

    predictionBar = bar;
    console.log(predicted_prob);
    predictionBar.animate(predicted_prob);  // Number from 0.0 to 1.0

}

