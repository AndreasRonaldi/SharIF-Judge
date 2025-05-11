#include <iostream>
#include <filesystem>
#include <fstream>
#include <string>

using namespace std;

int main() {
	string inpath = "../testcase/p1/in/";
	string outpath = "../testcase/p1/out/";
	// string inpath = "./p1/in/";
	// string outpath = "./p1/out/";

	filesystem::remove_all(inpath);
	filesystem::remove_all(outpath);

	filesystem::create_directories(inpath);
	filesystem::create_directories(outpath);
	ifstream Input("hard.txt");

	string inArr, inTarget, inSource, outValue;
	bool output = true;
	int index = 1;

	string outType = ".txt";

	while (getline(Input, inArr) && getline(Input, inSource) && getline(Input, inTarget) && getline(Input, outValue))
	{
		if (inArr.rfind("//", 0) == 0) continue;
		if (inTarget.rfind("//", 0) == 0) continue;
		if (inSource.rfind("//", 0) == 0) continue;
		if (outValue.rfind("//", 0) == 0) continue;
		
		char inpathfile[100];
		sprintf(inpathfile, "%sinput%d%s", inpath.c_str(), index, outType.c_str());
		char outpathfile[100];
		sprintf(outpathfile, "%soutput%d%s", outpath.c_str(), index, outType.c_str());

		cout << inpathfile << " " << outpathfile << "\n"; 

		ofstream In(inpathfile);
		ofstream Out(outpathfile);
	
		inArr.erase(0, 1);
		inArr.erase(inArr.size() - 1);

		int size = 0; 
		int sizeArr = 0;
		string temp = "";
		string outInput = "";

		for(char c: inArr) {
			if (c == '[') {
				size++;
				sizeArr = 1;
				temp = "";
			} else if (c == ']') {
				char t[10000];
				sprintf(t, "%d %s\n", sizeArr, temp.c_str());
				outInput += t;
			} else if (c == ',') {
				temp += " ";
				sizeArr++;
			} else {
				temp += c;
			}
		}

		In << size << "\n";
		In << outInput;
		In << inSource << " " << inTarget;
		Out << outValue;
		In.close();
		Out.close();
		index++;
	}

	return 0;
}
