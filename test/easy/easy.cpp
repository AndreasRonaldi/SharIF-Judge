#include <iostream>
#include <filesystem>
#include <fstream>
#include <string>

using namespace std;

int main() {
	string inpath = "../testcase/p3/in/";
	string outpath = "../testcase/p3/out/";

	filesystem::remove_all(inpath);
	filesystem::remove_all(outpath);

	filesystem::create_directories(inpath);
	filesystem::create_directories(outpath);
	ifstream Input("easy.txt");

	string strInput;
	bool output = true;
	int index = 1;

	string outType = ".txt";

	while (getline(Input, strInput))
	{
		if (strInput.rfind("//", 0) == 0) continue;
		if (strInput.rfind("#", 0) == 0) {
			output = false;
			continue;
		}
		
		char inpathfile[100];
		sprintf(inpathfile, "%sinput%d%s", inpath.c_str(), index, outType.c_str());
		char outpathfile[100];
		sprintf(outpathfile, "%soutput%d%s", outpath.c_str(), index, outType.c_str());

		cout << inpathfile << " " << outpathfile << "\n"; 

		ofstream In(inpathfile);
		ofstream Out(outpathfile);
	
		In << strInput;
		Out << (output ? "true" : "false");
		In.close();
		Out.close();
		index++;
	}

	return 0;
}
