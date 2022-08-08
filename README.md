# Signature 3 Detection

## Table of Contents
- [Signature 3 Detection](#signature-3-detection)
  * [Dataset Preprocessing](#dataset-preprocessing)
    + [Obtaining and Downsampling WGS Data](#obtaining-and-downsampling-wgs-data)
    + [Dataset Labeling](#dataset-labeling)
  * [Model Evaluation and Deployment](#model-evaluation-and-deployment)
    + [Hyperparameter tuning](#hyperparameter-tuning)
    + [Model Evaluation](#model-evaluation)
    + [Model Deployment](#model-deployment)

## Dataset Preprocessing

This section describes the Python scripts used to ingest and process data for [mutational signature analysis](https://en.wikipedia.org/wiki/Mutational_signatures), from public datasets in the [International Consortium for Cancer and Genomics (ICGC) Data Portal](https://dcc.icgc.org/), with an emphasis on adherence to [FAIR (Findable, Accessible, Interoperable, and Reusable) principles](https://www.go-fair.org/fair-principles/).

### Consuming ICGC Data

The jupyter notebook `notebooks/Consuming ICGC Data.ipynb` shows how to consume simple somatic mutation data from the ICGC Data Portal via its [APIs](https://docs.icgc.org/portal/api-endpoints/).

### Processing ICGC simple somatic mutation data
The jupyter notebook `Scripts/Dataset Preprocessing/Processing ICGC Data.ipynb` shows how to process the simple somatic mutation (SSM) data that we downloaded from the ICGC Data Portal. After processing the SSM dataset, we generate a mutational spectra matrix, which tallies the counts for each context (as determined by the base on the 5' and the 3' ends of the mutated allele) of single base substitution. To obtain the context of the substitution, we require the GRCh37 reference genome. We obtain this genome via the [UCGC Genome Browser API](https://hgdownload.soe.ucsc.edu/downloads.html). The mutational spectra matrix for the BRCA datasets is stored in `Data/MSK-Impact/WGS/`. This dataset can be readily used for mutational signature analysis.

### Simulating MSK-IMPACT 410 gene panel data from whole genome MAF files
The jupyter notebook `Scripts/Dataset Preprocessing/Simulating MSK-IMPACT 410.ipynb` shows how to simulate a mutational spectra from MSK-IMPACT 410 gene panel from the MAF files generated from the ICGC SSM whole genome analysis dataset.


### Consuming MSK-IMPACT data and preparing its mutational spectra matrix 
The jupyter notebook `Scripts/Dataset Preprocessing/Consuming and Preparing MSK-IMPACT Data.ipynb` shows how to use the [cBioPortal web API](https://www.cbioportal.org/webAPI) to download MSK-IMPACT data from the 2017 paper: [Mutational landscape of metastatic cancer revealed from prospective clinical sequencing of 10,000 patients](https://pubmed.ncbi.nlm.nih.gov/28481359/). The downloaded data is then converted into a mutational spectra matrix and stored at `Data/MSK-Impact/Panel/`.

## Dataset Labeling

### Bootstrap NNLS with [Sigminer](https://github.com/ShixiangWang/sigminer)

1. Please follow the instructions in the [Sigminer](https://github.com/ShixiangWang/sigminer) repository to set up your R environment to be able to run [Sigminer](https://github.com/ShixiangWang/sigminer). 
2. Place RScript `Scripts/RScripts/NNLS_Bootstrapping.R` into the repository where the sigminer environment is set up
3. Follow the instructions in `Scripts/RScripts/NNLS_Bootstrapping.R` to obtain the labels from the WGS dataset

## Model Evaluation and Deployment

### Hyperparameter tuning

Run through the scripts in `Scripts/Hyperparameter Tuning/` to retune each machine learning model's hyperparameters. 

### Model Evaluation

The jupyter notebook `Scripts/Main.ipynb` runs 10-fold-cross-validation on each of the four machine-learning models tested: XGBoost, Neural Network, K-nearest-neighbors, and Logistic Regression. This is done to pick out the optimal hyperparameters to use in the deployed models. You can use Google Colab to reproduce the model evaluation by following the steps here:

1. Download this GitHub Repository onto your local machine
2. Open and make a copy of this [Google Colab Notebook](https://colab.research.google.com/drive/14JfdfWqpCIIms5PRy8y0haEK-epjKRTv?usp=sharing)
3. 

### Model Deployment 

Each of the four machine-learning models tested (XGBoost, Neural Network, K-nearest-neighbors, and Logistic Regression) is ready for use at the [GitHub pages](https://aaronge-2020.github.io/Sig3-Detection/) website here: https://aaronge-2020.github.io/Sig3-Detection/

There are three steps outlined in this workflow pipeline: 

1. The uploading of a MAF file or a mutational spectrum matrix. To see the required file format for the upload, please examine provided in the `Data/Example Files/' folder. 
2. The comparison of the uploaded data and the training dataset. If the sample tested is an outlier datapoint, whose distribution falls outside of the training dataset's, then one should have less confidence in the model's predictive powers. 
3. Select a machine-learning model and obtain a prediction. 


