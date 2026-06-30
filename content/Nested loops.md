Loop inside a loop

```bash
 1  1  1  1  <-- R1
 2  2  2  2  <-- R2
 3  3  3  3  <-- R3
 4  4  4  4  <-- R4
 C1 C2 C3 C4

 C -> column
 R -> row
```

If you want to understand nested loop we should practice pattern so that we got clear understanding

1. Outer loop : no of rows
2. inner loop : no of columns
3. works in inner loop: each row

```cpp
#include<iostream>
using namespace std;
int main(){
	//outer loop
	for(int i=1; i<=4; i++){
		//inner loop
		for(int j=1; j<=4; j++){
			//work
			cout << i << " ";
		}
		cout << endl;
	}
}
```

![|697x426](https://res.cloudinary.com/dqkxxdrsg/image/upload/v1782448213/obsidian/ftxmiaxh9xw1rchzf3av.png)
![](https://res.cloudinary.com/dqkxxdrsg/image/upload/v1782448420/obsidian/hifkwqcxfzxpp0zfogif.png)
![](https://res.cloudinary.com/dqkxxdrsg/image/upload/v1782448520/obsidian/xacs58rup5qcdnndl0y2.png)
![](https://res.cloudinary.com/dqkxxdrsg/image/upload/v1782448603/obsidian/aqxrhxumujtorcwt9o42.png)
![](https://res.cloudinary.com/dqkxxdrsg/image/upload/v1782448679/obsidian/kgfburu5s3w4oeuor8ot.png)
![|697x263](https://res.cloudinary.com/dqkxxdrsg/image/upload/v1782448868/obsidian/tlai8hegcvmotvcp5oq1.png)
![](https://res.cloudinary.com/dqkxxdrsg/image/upload/v1782448972/obsidian/sjdmwtbwcbiojbllpzwi.png)
![|697x272](https://res.cloudinary.com/dqkxxdrsg/image/upload/v1782449096/obsidian/n092km4mhqr15avybf1h.png)
![](https://res.cloudinary.com/dqkxxdrsg/image/upload/v1782449158/obsidian/nkcjaiat67qaejdngcoh.png)
![|697x447](https://res.cloudinary.com/dqkxxdrsg/image/upload/v1782449212/obsidian/pjcj7j9yv615vd89fpya.png)
![|697x333](https://res.cloudinary.com/dqkxxdrsg/image/upload/v1782449280/obsidian/usg2mjic41ssb6n6meew.png)
![](https://res.cloudinary.com/dqkxxdrsg/image/upload/v1782449348/obsidian/jko4gnsqmnhoc3stmvwe.png)
![|697x336](https://res.cloudinary.com/dqkxxdrsg/image/upload/v1782449365/obsidian/zhcqjpmbz0kuhc6d0vvz.png)
